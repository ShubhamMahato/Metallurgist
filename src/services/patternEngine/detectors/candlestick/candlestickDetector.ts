import { OHLCV, SupportedTimeframe } from "../../types/candle";
import { DetectedPattern } from "../../types/pattern";

export class CandlestickPatternDetector {
  public detect(
    candles: readonly OHLCV[],
    timeframe: SupportedTimeframe,
    symbol: string = "XAUUSD",
    activeOnly: boolean = true
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const n = candles.length;
    if (n < 5) return patterns;

    // In live scanner (activeOnly = true), only scan the latest active bar (n - 1) and most recent closed bar (n - 2)
    const scanLimit = activeOnly ? Math.max(2, n - 2) : Math.max(2, n - 40);

    for (let i = n - 1; i >= scanLimit; i--) {
      const c = candles[i];
      const p1 = candles[i - 1];
      const p2 = candles[i - 2];
      const p3 = i >= 3 ? candles[i - 3] : null;
      const p4 = i >= 4 ? candles[i - 4] : null;

      // Candle properties
      const body = Math.abs(c.close - c.open);
      const range = c.high - c.low;
      const upperShadow = c.high - Math.max(c.open, c.close);
      const lowerShadow = Math.min(c.open, c.close) - c.low;
      const isBullish = c.close > c.open;
      const isBearish = c.close < c.open;
      const avgRange = (p1.high - p1.low + p2.high - p2.low + range) / 3 || 1;

      // 1. DOJI (Body <= 5% of range)
      if (range > 0 && body / range <= 0.05) {
        if (lowerShadow / range >= 0.65 && upperShadow / range <= 0.1) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "DRAGONFLY_DOJI", "Dragonfly Doji", "BULLISH", [c]));
        } else if (upperShadow / range >= 0.65 && lowerShadow / range <= 0.1) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "GRAVESTONE_DOJI", "Gravestone Doji", "BEARISH", [c]));
        } else if (upperShadow / range >= 0.35 && lowerShadow / range >= 0.35) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "LONG_LEGGED_DOJI", "Long-Legged Doji", "NEUTRAL", [c]));
        } else {
          patterns.push(this.buildPattern(c, symbol, timeframe, "DOJI", "Doji", "NEUTRAL", [c]));
        }
      }

      // 2. HAMMER & HANGING MAN (Small body at upper end, lower shadow >= 2x body, tiny upper shadow)
      if (range > 0 && lowerShadow >= 2 * body && upperShadow <= 0.15 * range && body >= 0.1 * range) {
        if (p1.close < p2.close) {
          // Downtrend context -> Hammer (Bullish)
          patterns.push(this.buildPattern(c, symbol, timeframe, "HAMMER", "Hammer", "BULLISH", [p1, c]));
        } else if (p1.close > p2.close) {
          // Uptrend context -> Hanging Man (Bearish)
          patterns.push(this.buildPattern(c, symbol, timeframe, "HANGING_MAN", "Hanging Man", "BEARISH", [p1, c]));
        }
      }

      // 3. INVERTED HAMMER & SHOOTING STAR (Small body at lower end, upper shadow >= 2x body, tiny lower shadow)
      if (range > 0 && upperShadow >= 2 * body && lowerShadow <= 0.15 * range && body >= 0.1 * range) {
        if (p1.close < p2.close) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "INVERTED_HAMMER", "Inverted Hammer", "BULLISH", [p1, c]));
        } else if (p1.close > p2.close) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "SHOOTING_STAR", "Shooting Star", "BEARISH", [p1, c]));
        }
      }

      // 4. MARUBOZU (Long body >= 85% of total range, shadows < 7.5%)
      if (range > 0 && body / range >= 0.85 && upperShadow / range < 0.08 && lowerShadow / range < 0.08) {
        if (isBullish) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "BULLISH_MARUBOZU", "Bullish Marubozu", "BULLISH", [c]));
        } else {
          patterns.push(this.buildPattern(c, symbol, timeframe, "BEARISH_MARUBOZU", "Bearish Marubozu", "BEARISH", [c]));
        }
      }

      // 5. SPINNING TOP (Small body 10%-30% of range, both upper and lower shadows significant)
      if (range > 0 && body / range >= 0.1 && body / range <= 0.3 && upperShadow / range >= 0.25 && lowerShadow / range >= 0.25) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "SPINNING_TOP", "Spinning Top", "NEUTRAL", [c]));
      }

      // 6. BULLISH & BEARISH ENGULFING (2-candle)
      const p1Body = Math.abs(p1.close - p1.open);
      if (isBullish && p1.close < p1.open && c.open <= p1.close && c.close >= p1.open && body > p1Body) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "BULLISH_ENGULFING", "Bullish Engulfing", "BULLISH", [p1, c]));
      } else if (isBearish && p1.close > p1.open && c.open >= p1.close && c.close <= p1.open && body > p1Body) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "BEARISH_ENGULFING", "Bearish Engulfing", "BEARISH", [p1, c]));
      }

      // 7. BULLISH & BEARISH HARAMI (2-candle: inside bar)
      if (isBullish && p1.close < p1.open && c.open >= p1.close && c.close <= p1.open && body < p1Body) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "BULLISH_HARAMI", "Bullish Harami", "BULLISH", [p1, c]));
      } else if (isBearish && p1.close > p1.open && c.open <= p1.close && c.close >= p1.open && body < p1Body) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "BEARISH_HARAMI", "Bearish Harami", "BEARISH", [p1, c]));
      }

      // 8. PIERCING PATTERN & DARK CLOUD COVER (2-candle)
      const p1Mid = (p1.open + p1.close) / 2;
      if (p1.close < p1.open && isBullish && c.open < p1.low && c.close > p1Mid && c.close < p1.open) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "PIERCING_PATTERN", "Piercing Pattern", "BULLISH", [p1, c]));
      } else if (p1.close > p1.open && isBearish && c.open > p1.high && c.close < p1Mid && c.close > p1.open) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "DARK_CLOUD_COVER", "Dark Cloud Cover", "BEARISH", [p1, c]));
      }

      // 9. TWEEZER TOP & BOTTOM (2-candle with nearly identical highs or lows)
      const highDiff = Math.abs(c.high - p1.high);
      const lowDiff = Math.abs(c.low - p1.low);
      if (highDiff / avgRange <= 0.05 && p1.close > p1.open && c.close < c.open) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "TWEEZER_TOP", "Tweezer Top", "BEARISH", [p1, c]));
      } else if (lowDiff / avgRange <= 0.05 && p1.close < p1.open && c.close > c.open) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "TWEEZER_BOTTOM", "Tweezer Bottom", "BULLISH", [p1, c]));
      }

      // 10. MORNING STAR & EVENING STAR (3-candle)
      const p2Body = Math.abs(p2.close - p2.open);
      if (p2.close < p2.open && p1Body < 0.3 * p2Body && isBullish && c.close > (p2.open + p2.close) / 2) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "MORNING_STAR", "Morning Star", "BULLISH", [p2, p1, c]));
      } else if (p2.close > p2.open && p1Body < 0.3 * p2Body && isBearish && c.close < (p2.open + p2.close) / 2) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "EVENING_STAR", "Evening Star", "BEARISH", [p2, p1, c]));
      }

      // 11. THREE WHITE SOLDIERS & THREE BLACK CROWS (3-candle)
      if (
        c.close > c.open &&
        p1.close > p1.open &&
        p2.close > p2.open &&
        c.close > p1.close &&
        p1.close > p2.close &&
        c.open > p1.open &&
        p1.open > p2.open
      ) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "THREE_WHITE_SOLDIERS", "Three White Soldiers", "BULLISH", [p2, p1, c]));
      } else if (
        c.close < c.open &&
        p1.close < p1.open &&
        p2.close < p2.open &&
        c.close < p1.close &&
        p1.close < p2.close &&
        c.open < p1.open &&
        p1.open < p2.open
      ) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "THREE_BLACK_CROWS", "Three Black Crows", "BEARISH", [p2, p1, c]));
      }

      // 12. RISING & FALLING THREE METHODS (5-candle continuation)
      if (p4 && p3) {
        // Rising Three Methods: Strong bullish (p4), 3 small bearish inside bars (p3, p2, p1), strong bullish breakout (c)
        if (
          p4.close > p4.open &&
          c.close > c.open &&
          c.close > p4.high &&
          p3.close < p3.open &&
          p2.close < p2.open &&
          p1.close < p1.open &&
          p1.low > p4.low &&
          p3.high < p4.high
        ) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "RISING_THREE_METHODS", "Rising Three Methods", "BULLISH", [p4, p3, p2, p1, c]));
        } else if (
          p4.close < p4.open &&
          c.close < c.open &&
          c.close < p4.low &&
          p3.close > p3.open &&
          p2.close > p2.open &&
          p1.close > p1.open &&
          p1.high < p4.high &&
          p3.low > p4.low
        ) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "FALLING_THREE_METHODS", "Falling Three Methods", "BEARISH", [p4, p3, p2, p1, c]));
        }
      }

      // 13. THREE INSIDE UP & THREE INSIDE DOWN
      const p2BodyForInside = Math.abs(p2.close - p2.open);
      if (p2.close < p2.open && p1.close > p1.open && p1.open >= p2.close && p1.close <= p2.open && c.close > p2.open) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "THREE_INSIDE_UP", "Three Inside Up", "BULLISH", [p2, p1, c]));
      } else if (p2.close > p2.open && p1.close < p1.open && p1.open <= p2.close && p1.close >= p2.open && c.close < p2.open) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "THREE_INSIDE_DOWN", "Three Inside Down", "BEARISH", [p2, p1, c]));
      }

      // 14. THREE OUTSIDE UP & THREE OUTSIDE DOWN
      if (p2.close < p2.open && p1.close > p1.open && p1.open < p2.close && p1.close > p2.open && c.close > p1.close) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "THREE_OUTSIDE_UP", "Three Outside Up", "BULLISH", [p2, p1, c]));
      } else if (p2.close > p2.open && p1.close < p1.open && p1.open > p2.close && p1.close < p2.open && c.close < p1.close) {
        patterns.push(this.buildPattern(c, symbol, timeframe, "THREE_OUTSIDE_DOWN", "Three Outside Down", "BEARISH", [p2, p1, c]));
      }

      // 15. BULLISH & BEARISH BELT HOLD
      if (body / range >= 0.75) {
        if (isBullish && Math.abs(c.open - c.low) / range < 0.03 && p1.close < p1.open) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "BULLISH_BELT_HOLD", "Bullish Belt Hold", "BULLISH", [p1, c]));
        } else if (isBearish && Math.abs(c.open - c.high) / range < 0.03 && p1.close > p1.open) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "BEARISH_BELT_HOLD", "Bearish Belt Hold", "BEARISH", [p1, c]));
        }
      }

      // 16. BULLISH & BEARISH KICKER
      if (p1Body / (p1.high - p1.low || 1) >= 0.6 && body / range >= 0.6) {
        if (p1.close < p1.open && isBullish && c.open >= p1.open) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "BULLISH_KICKER", "Bullish Kicker", "BULLISH", [p1, c]));
        } else if (p1.close > p1.open && isBearish && c.open <= p1.open) {
          patterns.push(this.buildPattern(c, symbol, timeframe, "BEARISH_KICKER", "Bearish Kicker", "BEARISH", [p1, c]));
        }
      }
    }

    return patterns;
  }

  private buildPattern(
    candle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    patternCode: string,
    name: string,
    direction: "BULLISH" | "BEARISH" | "NEUTRAL",
    constituentCandles: OHLCV[]
  ): DetectedPattern {
    const firstBar = constituentCandles[0];
    const lastBar = constituentCandles[constituentCandles.length - 1];
    const isCurrent = Boolean(lastBar.isOpen);

    const minPrice = Math.min(...constituentCandles.map((c) => c.low));
    const maxPrice = Math.max(...constituentCandles.map((c) => c.high));

    return {
      id: `${symbol}-${timeframe}-${patternCode}-${firstBar.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CANDLESTICK",
      pattern: patternCode,
      name,
      direction,
      state: isCurrent ? "FORMING" : "CONFIRMED",
      firstDetectedAt: new Date(firstBar.timestamp * 1000).toISOString(),
      lastUpdatedAt: new Date(lastBar.timestamp * 1000).toISOString(),
      startTime: firstBar.timestamp,
      endTime: lastBar.timestamp,
      latestStructuralTimestamp: lastBar.timestamp,
      keyPoints: constituentCandles.map((c, idx) => ({
        label: `Bar ${idx + 1}`,
        timestamp: c.timestamp,
        price: c.close,
        isProvisional: Boolean(c.isOpen),
      })),
      levels: {
        entry: lastBar.close,
        stopLoss: direction === "BULLISH" ? minPrice : maxPrice,
        target1:
          direction === "BULLISH"
            ? lastBar.close + (lastBar.close - minPrice)
            : lastBar.close - (maxPrice - lastBar.close),
      },
      progress: {
        percentage: isCurrent ? 80 : 100,
        description: isCurrent ? "Active bar still forming" : "Candle formation closed and confirmed",
      },
      confirmationCondition: {
        description: isCurrent ? "Wait for candle close" : "Candle closed with valid ratio profile",
        isMet: !isCurrent,
      },
      invalidationCondition: {
        description:
          direction === "BULLISH"
            ? `Price breaks below ${minPrice.toFixed(2)}`
            : `Price breaks above ${maxPrice.toFixed(2)}`,
        priceLevel: direction === "BULLISH" ? minPrice : maxPrice,
      },
    };
  }
}
