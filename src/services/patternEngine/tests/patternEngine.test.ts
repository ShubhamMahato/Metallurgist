import { aggregateCandles } from "../data/candleAggregator";
import { CandleStore } from "../data/candleStore";
import { SwingDetector } from "../core/swingDetector";
import { PatternEngine } from "../engine/PatternEngine";
import {
  createBullishEngulfingFixture,
  createDoubleBottomFixture,
  createHammerFixture,
  createHeadAndShouldersFixture,
  generateCandlesFromPrices,
} from "./syntheticFixtures";
import { OHLCV } from "../types/candle";

export function runAllPatternEngineTests(): { passed: number; failed: number; log: string[] } {
  const logs: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      logs.push(`  ✓ ${msg}`);
      passed++;
    } else {
      logs.push(`  ✗ FAILED: ${msg}`);
      failed++;
    }
  }

  logs.push("=== TEST SUITE: Pattern Detection Engine ===");

  // 1. Test Candle Aggregator
  logs.push("\n1. Candle Aggregator (5m -> 10m):");
  const candles5m: OHLCV[] = [
    { timestamp: 1700000000, isoTime: "", open: 1900, high: 1910, low: 1895, close: 1905, volume: 10, tickVolume: 20, isOpen: false },
    { timestamp: 1700000300, isoTime: "", open: 1905, high: 1915, low: 1902, close: 1912, volume: 15, tickVolume: 25, isOpen: false },
  ];
  const agg10m = aggregateCandles(candles5m, "10m");
  assert(agg10m.length === 1, "Aggregates 2x 5m candles into 1x 10m candle");
  assert(agg10m[0]?.open === 1900, "Preserves first open (1900)");
  assert(agg10m[0]?.high === 1915, "Preserves max high (1915)");
  assert(agg10m[0]?.low === 1895, "Preserves min low (1895)");
  assert(agg10m[0]?.close === 1912, "Preserves last close (1912)");
  assert(agg10m[0]?.tickVolume === 45, "Sums tick volume correctly (45)");

  // 2. Test Candle Store Deduplication & Sorting
  logs.push("\n2. Candle Store Deduplication & Upsert:");
  const store = new CandleStore("XAUUSD", "5m");
  store.merge([
    { timestamp: 1700000300, isoTime: "", open: 10, high: 12, low: 9, close: 11, volume: 1, isOpen: false },
    { timestamp: 1700000000, isoTime: "", open: 5, high: 7, low: 4, close: 6, volume: 1, isOpen: false },
  ]);
  assert(store.getAll().length === 2, "Stores unique candles");
  assert(store.getAll()[0].timestamp === 1700000000, "Sorts in strict ascending chronological order");

  // Upsert update to active candle
  store.merge([
    { timestamp: 1700000300, isoTime: "", open: 10, high: 15, low: 9, close: 14, volume: 2, isOpen: true },
  ]);
  assert(store.getAll().length === 2, "Does not duplicate candle on update");
  assert(store.getAll()[1].high === 15, "Updates existing open candle values");

  // 3. Test Swing Detector & No-Repainting Guarantee
  logs.push("\n3. Swing Detector Non-Repainting Verification:");
  const swingPrices = [1900, 1910, 1920, 1935, 1925, 1915, 1905, 1920, 1930];
  const swingCandles = generateCandlesFromPrices(swingPrices, 1700000000, 300);
  const swingDetector = new SwingDetector({ leftBars: 2, rightBars: 2 });
  const swings = swingDetector.detectSwings(swingCandles);

  const peak = swings.find((s) => s.type === "HIGH");
  assert(peak !== undefined, "Detects swing high peak");
  if (peak) {
    assert(peak.price > 1930, "Identifies peak at 1935");
    assert(peak.isProvisional === false, "Confirmed swing point is marked non-provisional");
    assert(peak.confirmedAtIndex >= peak.index + 2, "Swing high is only confirmed after rightBars closed");
  }

  // 4. Test Candlestick Detection
  logs.push("\n4. Candlestick Patterns:");
  const engine = new PatternEngine();

  // Test Bullish Engulfing
  const engulfingCandles = [
    ...generateCandlesFromPrices([1960, 1955, 1950], 1700000000, 300),
    ...createBullishEngulfingFixture(),
  ];
  const engulfingRes = engine.scan(engulfingCandles, "5m");
  const engulfingPat = engulfingRes.patterns.find((p) => p.pattern === "BULLISH_ENGULFING");
  assert(engulfingPat !== undefined, "Detects Bullish Engulfing pattern");

  // Test Hammer
  const hammerCandles = [
    ...generateCandlesFromPrices([1970, 1965, 1960], 1700000000, 300),
    ...createHammerFixture(),
  ];
  const hammerRes = engine.scan(hammerCandles, "5m");
  const hammerPat = hammerRes.patterns.find((p) => p.pattern === "HAMMER");
  assert(hammerPat !== undefined, "Detects Hammer candlestick pattern");

  // 5. Test Classical Patterns (Double Bottom & Head and Shoulders)
  logs.push("\n5. Classical Chart Patterns:");
  const dbCandles = createDoubleBottomFixture();
  const dbRes = engine.scan(dbCandles, "5m");
  const dbPat = dbRes.patterns.find((p) => p.pattern === "DOUBLE_BOTTOM");
  assert(dbPat !== undefined, "Detects Double Bottom classical pattern");
  if (dbPat) {
    assert(dbPat.direction === "BULLISH", "Direction is BULLISH");
    assert(dbPat.keyPoints.length === 3, "Contains 3 key points: Trough 1, Neckline, Trough 2");
  }

  const hsCandles = createHeadAndShouldersFixture();
  const hsRes = engine.scan(hsCandles, "5m");
  const hsPat = hsRes.patterns.find((p) => p.pattern === "HEAD_AND_SHOULDERS");
  assert(hsPat !== undefined, "Detects Head and Shoulders formation");
  if (hsPat) {
    assert(hsPat.direction === "BEARISH", "Direction is BEARISH");
    assert(hsPat.keyPoints.length === 5, "Includes Left Shoulder, Neckline 1, Head, Neckline 2, Right Shoulder");
  }

  // 6. Test Lifecycle Transitions & Deduplication
  logs.push("\n6. Pattern Lifecycle Management & Deduplication:");
  const initialScanCount = engine.getAllPatterns().length;
  // Re-scanning with same candles should update, not create duplicate patterns
  engine.scan(hsCandles, "5m");
  const afterScanCount = engine.getAllPatterns().length;
  assert(initialScanCount === afterScanCount, "Re-scanning existing candles does not create duplicates");

  logs.push(`\n=== RESULT: ${passed} PASSED, ${failed} FAILED ===\n`);
  return { passed, failed, log: logs };
}

// Auto-run if executed directly
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("patternEngine.test")) {
  const result = runAllPatternEngineTests();
  console.log(result.log.join("\n"));
  if (result.failed > 0) process.exit(1);
}

