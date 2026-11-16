import { OHLCV, SupportedTimeframe } from "../types/candle";

export class CandleStore {
  private candles: OHLCV[] = [];
  private timestampIndex = new Map<number, number>(); // timestamp -> index
  private listeners: Set<(candles: OHLCV[]) => void> = new Set();
  public readonly symbol: string;
  public readonly timeframe: SupportedTimeframe;

  constructor(symbol: string = "XAUUSD", timeframe: SupportedTimeframe = "5m") {
    this.symbol = symbol;
    this.timeframe = timeframe;
  }

  /**
   * Insert or merge batch of candles. Handles upserts, duplicates, and preserves strict ascending order.
   */
  public merge(newCandles: OHLCV[]): void {
    if (newCandles.length === 0) return;

    let modified = false;

    for (const candle of newCandles) {
      const idx = this.timestampIndex.get(candle.timestamp);
      if (idx !== undefined) {
        // Update existing candle (e.g. current open candle getting updated ticks)
        const current = this.candles[idx];
        if (
          current.open !== candle.open ||
          current.high !== candle.high ||
          current.low !== candle.low ||
          current.close !== candle.close ||
          current.isOpen !== candle.isOpen ||
          current.tickVolume !== candle.tickVolume
        ) {
          this.candles[idx] = { ...current, ...candle };
          modified = true;
        }
      } else {
        // New candle timestamp
        this.candles.push(candle);
        modified = true;
      }
    }

    if (modified) {
      // Sort strictly by ascending timestamp
      this.candles.sort((a, b) => a.timestamp - b.timestamp);
      this.rebuildIndex();
      this.notify();
    }
  }

  public set(allCandles: OHLCV[]): void {
    this.candles = [...allCandles].sort((a, b) => a.timestamp - b.timestamp);
    this.rebuildIndex();
    this.notify();
  }

  public clear(): void {
    this.candles = [];
    this.timestampIndex.clear();
    this.notify();
  }

  public getAll(): readonly OHLCV[] {
    return this.candles;
  }

  /**
   * Returns only completed/closed candles (ignoring the active live bar if it's open)
   */
  public getClosed(): OHLCV[] {
    return this.candles.filter((c) => !c.isOpen);
  }

  /**
   * Returns the current active/incomplete candle if present
   */
  public getActive(): OHLCV | null {
    const last = this.candles[this.candles.length - 1];
    return last && last.isOpen ? last : null;
  }

  public getLatest(n: number): OHLCV[] {
    return this.candles.slice(-n);
  }

  public subscribe(cb: (candles: OHLCV[]) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private rebuildIndex(): void {
    this.timestampIndex.clear();
    for (let i = 0; i < this.candles.length; i++) {
      this.timestampIndex.set(this.candles[i].timestamp, i);
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.candles);
      } catch (err) {
        console.error("CandleStore listener error:", err);
      }
    }
  }
}
