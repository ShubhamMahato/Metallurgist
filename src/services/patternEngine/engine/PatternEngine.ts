import { OHLCV, SupportedTimeframe } from "../types/candle";
import { DetectedPattern, PatternFilter, PatternLifecycleState } from "../types/pattern";
import { SwingDetector, SwingPoint } from "../core/swingDetector";
import { CandlestickPatternDetector } from "../detectors/candlestick/candlestickDetector";
import { ClassicalPatternDetector } from "../detectors/classical/classicalDetector";
import { HarmonicPatternDetector } from "../detectors/harmonic/harmonicDetector";
import { MarketStructureDetector } from "../detectors/marketStructure/marketStructureDetector";
import { StatisticalPatternDetector } from "../detectors/statistical/statisticalDetector";

export interface PatternScanResult {
  patterns: DetectedPattern[];
  swings: SwingPoint[];
  scannedAt: string;
  candleCount: number;
}

export class PatternEngine {
  private swingDetector: SwingDetector;
  private candlestickDetector: CandlestickPatternDetector;
  private classicalDetector: ClassicalPatternDetector;
  private harmonicDetector: HarmonicPatternDetector;
  private marketStructureDetector: MarketStructureDetector;
  private statisticalDetector: StatisticalPatternDetector;

  // Stored state: id -> DetectedPattern
  private patternStore: Map<string, DetectedPattern> = new Map();
  private lastSwings: SwingPoint[] = [];
  private listeners: Set<(result: PatternScanResult) => void> = new Set();

  constructor() {
    this.swingDetector = new SwingDetector({ leftBars: 3, rightBars: 3 });
    this.candlestickDetector = new CandlestickPatternDetector();
    this.classicalDetector = new ClassicalPatternDetector();
    this.harmonicDetector = new HarmonicPatternDetector();
    this.marketStructureDetector = new MarketStructureDetector();
    this.statisticalDetector = new StatisticalPatternDetector();
  }

  /**
   * Main scan function: processes the candles through swing detection and all pattern detectors.
   * Updates existing pattern states and appends newly detected patterns.
   */
  public scan(
    candles: readonly OHLCV[],
    timeframe: SupportedTimeframe,
    symbol: string = "XAUUSD",
    activeOnly: boolean = true
  ): PatternScanResult {
    if (candles.length < 5) {
      return { patterns: [], swings: [], scannedAt: new Date().toISOString(), candleCount: candles.length };
    }

    // 1. Detect Swing Points (with strict separation of confirmed vs provisional)
    const swings = this.swingDetector.detectSwings(candles);
    const alternatingSwings = this.swingDetector.getAlternatingSwings(swings);
    this.lastSwings = swings;

    // 2. Run All Detectors (scoped to active current window when activeOnly = true)
    const detectedList: DetectedPattern[] = [];

    // A. Candlestick Patterns
    try {
      const candlesResult = this.candlestickDetector.detect(candles, timeframe, symbol, activeOnly);
      detectedList.push(...candlesResult);
    } catch (err) {
      console.warn("Candlestick detector error:", err);
    }

    // B. Classical Chart Patterns
    try {
      const classicalResult = this.classicalDetector.detect(candles, alternatingSwings, timeframe, symbol, activeOnly);
      detectedList.push(...classicalResult);
    } catch (err) {
      console.warn("Classical detector error:", err);
    }

    // C. Harmonic Patterns
    try {
      const harmonicResult = this.harmonicDetector.detect(candles, alternatingSwings, timeframe, symbol, activeOnly);
      detectedList.push(...harmonicResult);
    } catch (err) {
      console.warn("Harmonic detector error:", err);
    }

    // D. Market Structure
    try {
      const structureResult = this.marketStructureDetector.detect(candles, swings, timeframe, symbol, activeOnly);
      detectedList.push(...structureResult);
    } catch (err) {
      console.warn("Market structure detector error:", err);
    }

    // E. Statistical & Volatility Patterns
    try {
      const statResult = this.statisticalDetector.detect(candles, swings, timeframe, symbol);
      detectedList.push(...statResult);
    } catch (err) {
      console.warn("Statistical detector error:", err);
    }

    // 3. Reconcile with Stored Patterns (Lifecycle Transitions & Deduplication)
    const nowIso = new Date().toISOString();

    if (activeOnly) {
      // In active scanner mode, the store represents the current active detections
      const activeMap = new Map<string, DetectedPattern>();
      for (const pat of detectedList) {
        const existing = this.patternStore.get(pat.id);
        const updatedState = existing ? this.resolveLifecycleTransition(existing.state, pat.state) : pat.state;
        activeMap.set(pat.id, {
          ...pat,
          state: updatedState,
          firstDetectedAt: existing?.firstDetectedAt || pat.firstDetectedAt || nowIso,
          lastUpdatedAt: nowIso,
        });
      }
      this.patternStore = activeMap;
    } else {
      for (const pat of detectedList) {
        const existing = this.patternStore.get(pat.id);
        if (existing) {
          const updatedState = this.resolveLifecycleTransition(existing.state, pat.state);
          this.patternStore.set(pat.id, {
            ...existing,
            ...pat,
            state: updatedState,
            lastUpdatedAt: nowIso,
          });
        } else {
          this.patternStore.set(pat.id, {
            ...pat,
            firstDetectedAt: pat.firstDetectedAt || nowIso,
            lastUpdatedAt: nowIso,
          });
        }
      }
    }

    // Filter down to the active timeframe patterns
    const allPatterns = Array.from(this.patternStore.values()).filter(
      (p) => p.timeframe === timeframe && p.instrument === symbol
    );

    // Sort: newest first
    allPatterns.sort((a, b) => b.startTime - a.startTime);

    const result: PatternScanResult = {
      patterns: allPatterns,
      swings: this.lastSwings,
      scannedAt: nowIso,
      candleCount: candles.length,
    };

    this.notify(result);
    return result;
  }

  /**
   * Clears state when switching instruments or clearing cache
   */
  public clear(): void {
    this.patternStore.clear();
    this.lastSwings = [];
  }

  public getAllPatterns(): DetectedPattern[] {
    return Array.from(this.patternStore.values());
  }

  public getSwings(): SwingPoint[] {
    return this.lastSwings;
  }

  public subscribe(cb: (result: PatternScanResult) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Helper to filter patterns by family, state, direction, search query
   */
  public static filterPatterns(patterns: DetectedPattern[], filter: PatternFilter): DetectedPattern[] {
    return patterns.filter((p) => {
      if (filter.families.length > 0 && !filter.families.includes(p.family)) return false;
      if (filter.directions.length > 0 && !filter.directions.includes(p.direction)) return false;
      if (filter.states.length > 0 && !filter.states.includes(p.state)) return false;
      if (filter.timeframe && p.timeframe !== filter.timeframe) return false;
      if (filter.searchQuery && filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesFamily = p.family.toLowerCase().includes(query);
        const matchesPattern = p.pattern.toLowerCase().includes(query);
        if (!matchesName && !matchesFamily && !matchesPattern) return false;
      }
      return true;
    });
  }

  private resolveLifecycleTransition(
    current: PatternLifecycleState,
    incoming: PatternLifecycleState
  ): PatternLifecycleState {
    if (current === "INVALIDATED") return "INVALIDATED"; // Once invalidated, stays invalidated
    if (incoming === "INVALIDATED") return "INVALIDATED";
    if (current === "CONFIRMED" && (incoming === "COMPLETED" || incoming === "DEVELOPING")) return "CONFIRMED";
    return incoming;
  }

  private notify(result: PatternScanResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (err) {
        console.error("PatternEngine listener error:", err);
      }
    }
  }
}
