import { OHLCV } from "../types/candle";

export type SwingType = "HIGH" | "LOW";

export interface SwingPoint {
  index: number;
  timestamp: number; // seconds
  isoTime: string;
  price: number;
  type: SwingType;
  isProvisional: boolean;
  confirmedAtIndex: number;
  confirmedAtTimestamp: number;
}

export interface SwingDetectorConfig {
  leftBars?: number; // default 3
  rightBars?: number; // default 3
}

export class SwingDetector {
  private leftBars: number;
  private rightBars: number;

  constructor(config?: SwingDetectorConfig) {
    this.leftBars = config?.leftBars ?? 3;
    this.rightBars = config?.rightBars ?? 3;
  }

  /**
   * Detects all confirmed and provisional swing highs & lows.
   * Guarantees strict non-repainting: swing points carry the exact timestamp/index when confirmed.
   */
  public detectSwings(candles: readonly OHLCV[]): SwingPoint[] {
    const n = candles.length;
    if (n < this.leftBars + 1) return [];

    const swings: SwingPoint[] = [];

    // Only closed candles can confirm swing points
    const closedCount = candles[n - 1]?.isOpen ? n - 1 : n;

    for (let i = this.leftBars; i < closedCount; i++) {
      const current = candles[i];

      // Check Swing High
      let isHigh = true;
      for (let l = 1; l <= this.leftBars; l++) {
        if (candles[i - l].high >= current.high) {
          isHigh = false;
          break;
        }
      }

      if (isHigh) {
        // Check right bars
        const availableRight = closedCount - 1 - i;
        if (availableRight >= this.rightBars) {
          // Can be fully confirmed
          let confirmed = true;
          for (let r = 1; r <= this.rightBars; r++) {
            if (candles[i + r].high >= current.high) {
              confirmed = false;
              break;
            }
          }
          if (confirmed) {
            swings.push({
              index: i,
              timestamp: current.timestamp,
              isoTime: current.isoTime,
              price: current.high,
              type: "HIGH",
              isProvisional: false,
              confirmedAtIndex: i + this.rightBars,
              confirmedAtTimestamp: candles[i + this.rightBars].timestamp,
            });
          }
        } else {
          // Potential provisional swing high (fewer than rightBars closed candles)
          let validSoFar = true;
          for (let r = 1; r <= availableRight; r++) {
            if (candles[i + r].high >= current.high) {
              validSoFar = false;
              break;
            }
          }
          if (validSoFar) {
            swings.push({
              index: i,
              timestamp: current.timestamp,
              isoTime: current.isoTime,
              price: current.high,
              type: "HIGH",
              isProvisional: true,
              confirmedAtIndex: -1,
              confirmedAtTimestamp: -1,
            });
          }
        }
      }

      // Check Swing Low
      let isLow = true;
      for (let l = 1; l <= this.leftBars; l++) {
        if (candles[i - l].low <= current.low) {
          isLow = false;
          break;
        }
      }

      if (isLow) {
        // Check right bars
        const availableRight = closedCount - 1 - i;
        if (availableRight >= this.rightBars) {
          let confirmed = true;
          for (let r = 1; r <= this.rightBars; r++) {
            if (candles[i + r].low <= current.low) {
              confirmed = false;
              break;
            }
          }
          if (confirmed) {
            swings.push({
              index: i,
              timestamp: current.timestamp,
              isoTime: current.isoTime,
              price: current.low,
              type: "LOW",
              isProvisional: false,
              confirmedAtIndex: i + this.rightBars,
              confirmedAtTimestamp: candles[i + this.rightBars].timestamp,
            });
          }
        } else {
          let validSoFar = true;
          for (let r = 1; r <= availableRight; r++) {
            if (candles[i + r].low <= current.low) {
              validSoFar = false;
              break;
            }
          }
          if (validSoFar) {
            swings.push({
              index: i,
              timestamp: current.timestamp,
              isoTime: current.isoTime,
              price: current.low,
              type: "LOW",
              isProvisional: true,
              confirmedAtIndex: -1,
              confirmedAtTimestamp: -1,
            });
          }
        }
      }
    }

    // Sort by chronological order
    swings.sort((a, b) => a.timestamp - b.timestamp);

    // Alternate filter to ensure clean alternating peaks and valleys for harmonic/classical chart analysis
    return swings;
  }

  /**
   * Returns clean alternating swings (High, Low, High, Low...) by choosing highest high or lowest low between consecutive same-type swings
   */
  public getAlternatingSwings(swings: SwingPoint[]): SwingPoint[] {
    if (swings.length === 0) return [];

    const result: SwingPoint[] = [swings[0]];

    for (let i = 1; i < swings.length; i++) {
      const current = swings[i];
      const prev = result[result.length - 1];

      if (current.type === prev.type) {
        // Same type consecutive swing: keep the extreme one
        if (current.type === "HIGH" && current.price > prev.price) {
          result[result.length - 1] = current;
        } else if (current.type === "LOW" && current.price < prev.price) {
          result[result.length - 1] = current;
        }
      } else {
        result.push(current);
      }
    }

    return result;
  }
}
