import { OHLCV, SupportedTimeframe } from "../../types/candle";
import {
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateSupertrend,
  calculateBollingerBands,
  calculateATR,
} from "../../core/indicators";
import { SwingPoint } from "../../core/swingDetector";
import { DetectedPattern } from "../../types/pattern";

export class StrategyDetector {
  public detect(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    timeframe: SupportedTimeframe,
    symbol: string = "XAUUSD"
  ): DetectedPattern[] {
    const strategies: DetectedPattern[] = [];
    const n = candles.length;
    if (n < 25) return strategies;

    const closes = candles.map((c) => c.close);
    const latest = candles[n - 1];
    const latestTs = latest.timestamp;
    const latestIso = latest.isoTime;

    // Calculate Core Indicator Sets
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, Math.min(200, n));
    const macd = calculateMACD(candles as OHLCV[], 12, 26, 9);
    const rsi = calculateRSI(candles as OHLCV[], 14);
    const supertrend = calculateSupertrend(candles as OHLCV[], 10, 3);
    const bb = calculateBollingerBands(candles as OHLCV[], 20, 2);
    const atr = calculateATR(candles as OHLCV[], 14);
    const currentAtr = atr[n - 1] ?? (latest.high - latest.low);

    // =========================================================================
    // 1. EMA 9/21 FAST DYNAMIC MOMENTUM CROSSOVER (Active within last 4 bars)
    // =========================================================================
    for (let offset = 0; offset < Math.min(4, n - 2); offset++) {
      const idx = n - 1 - offset;
      const prevIdx = idx - 1;
      const e9Now = ema9[idx];
      const e21Now = ema21[idx];
      const e9Prev = ema9[prevIdx];
      const e21Prev = ema21[prevIdx];

      if (e9Now !== null && e21Now !== null && e9Prev !== null && e21Prev !== null) {
        // Bullish 9/21 EMA Cross
        if (e9Prev <= e21Prev && e9Now > e21Now) {
          const crossCandle = candles[idx];
          strategies.push({
            id: `${symbol}-${timeframe}-EMA9_21_BULL-${crossCandle.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STRATEGY",
            pattern: "EMA_9_21_CROSS",
            name: "EMA 9 / 21 Bullish Cross",
            direction: "BULLISH",
            state: offset === 0 && latest.isOpen ? "DEVELOPING" : "CONFIRMED",
            firstDetectedAt: crossCandle.isoTime,
            lastUpdatedAt: latestIso,
            startTime: candles[prevIdx].timestamp,
            endTime: crossCandle.timestamp,
            latestStructuralTimestamp: latestTs,
            keyPoints: [
              { label: "EMA 21", timestamp: crossCandle.timestamp, price: e21Now },
              { label: "EMA 9 Cross", timestamp: crossCandle.timestamp, price: e9Now },
            ],
            levels: {
              entry: crossCandle.close,
              stopLoss: e21Now - currentAtr,
              target1: crossCandle.close + currentAtr * 2,
            },
            progress: {
              percentage: 100,
              description: `Fast 9 EMA ($${e9Now.toFixed(1)}) crossed above 21 EMA ($${e21Now.toFixed(1)}): Short-term bullish momentum`,
            },
          });
          break; // Keep only most recent cross
        }
        // Bearish 9/21 EMA Cross
        else if (e9Prev >= e21Prev && e9Now < e21Now) {
          const crossCandle = candles[idx];
          strategies.push({
            id: `${symbol}-${timeframe}-EMA9_21_BEAR-${crossCandle.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STRATEGY",
            pattern: "EMA_9_21_CROSS",
            name: "EMA 9 / 21 Bearish Cross",
            direction: "BEARISH",
            state: offset === 0 && latest.isOpen ? "DEVELOPING" : "CONFIRMED",
            firstDetectedAt: crossCandle.isoTime,
            lastUpdatedAt: latestIso,
            startTime: candles[prevIdx].timestamp,
            endTime: crossCandle.timestamp,
            latestStructuralTimestamp: latestTs,
            keyPoints: [
              { label: "EMA 21", timestamp: crossCandle.timestamp, price: e21Now },
              { label: "EMA 9 Cross", timestamp: crossCandle.timestamp, price: e9Now },
            ],
            levels: {
              entry: crossCandle.close,
              stopLoss: e21Now + currentAtr,
              target1: crossCandle.close - currentAtr * 2,
            },
            progress: {
              percentage: 100,
              description: `Fast 9 EMA ($${e9Now.toFixed(1)}) crossed below 21 EMA ($${e21Now.toFixed(1)}): Short-term bearish momentum`,
            },
          });
          break; // Keep only most recent cross
        }
      }
    }

    // =========================================================================
    // 2. EMA 50/200 GOLDEN CROSS & DEATH CROSS (Institutional Trend Filter)
    // =========================================================================
    if (n >= 40) {
      for (let offset = 0; offset < Math.min(10, n - 2); offset++) {
        const idx = n - 1 - offset;
        const prevIdx = idx - 1;
        const e50Now = ema50[idx];
        const e200Now = ema200[idx];
        const e50Prev = ema50[prevIdx];
        const e200Prev = ema200[prevIdx];

        if (e50Now !== null && e200Now !== null && e50Prev !== null && e200Prev !== null) {
          // Golden Cross
          if (e50Prev <= e200Prev && e50Now > e200Now) {
            const crossCandle = candles[idx];
            strategies.push({
              id: `${symbol}-${timeframe}-GOLDEN_CROSS-${crossCandle.timestamp}`,
              instrument: symbol,
              timeframe,
              family: "STRATEGY",
              pattern: "GOLDEN_CROSS",
              name: "EMA Golden Cross (50/200)",
              direction: "BULLISH",
              state: "CONFIRMED",
              firstDetectedAt: crossCandle.isoTime,
              lastUpdatedAt: latestIso,
              startTime: candles[prevIdx].timestamp,
              endTime: crossCandle.timestamp,
              latestStructuralTimestamp: latestTs,
              keyPoints: [
                { label: "50 EMA", timestamp: crossCandle.timestamp, price: e50Now },
                { label: "200 EMA", timestamp: crossCandle.timestamp, price: e200Now },
              ],
              levels: {
                entry: crossCandle.close,
                stopLoss: e200Now,
                target1: crossCandle.close + currentAtr * 3,
              },
              progress: {
                percentage: 100,
                description: "50 EMA crossed above 200 EMA: Major institutional bullish macro trend",
              },
            });
            break;
          }
          // Death Cross
          else if (e50Prev >= e200Prev && e50Now < e200Now) {
            const crossCandle = candles[idx];
            strategies.push({
              id: `${symbol}-${timeframe}-DEATH_CROSS-${crossCandle.timestamp}`,
              instrument: symbol,
              timeframe,
              family: "STRATEGY",
              pattern: "DEATH_CROSS",
              name: "EMA Death Cross (50/200)",
              direction: "BEARISH",
              state: "CONFIRMED",
              firstDetectedAt: crossCandle.isoTime,
              lastUpdatedAt: latestIso,
              startTime: candles[prevIdx].timestamp,
              endTime: crossCandle.timestamp,
              latestStructuralTimestamp: latestTs,
              keyPoints: [
                { label: "50 EMA", timestamp: crossCandle.timestamp, price: e50Now },
                { label: "200 EMA", timestamp: crossCandle.timestamp, price: e200Now },
              ],
              levels: {
                entry: crossCandle.close,
                stopLoss: e200Now,
                target1: crossCandle.close - currentAtr * 3,
              },
              progress: {
                percentage: 100,
                description: "50 EMA crossed below 200 EMA: Major institutional bearish macro trend",
              },
            });
            break;
          }
        }
      }
    }

    // =========================================================================
    // 3. MACD SIGNAL LINE CROSSOVER & MOMENTUM EXPANSION (Active within last 4 bars)
    // =========================================================================
    for (let offset = 0; offset < Math.min(4, n - 2); offset++) {
      const idx = n - 1 - offset;
      const prevIdx = idx - 1;
      const macdLineNow = macd.macdLine[idx];
      const macdSigNow = macd.signalLine[idx];
      const macdLinePrev = macd.macdLine[prevIdx];
      const macdSigPrev = macd.signalLine[prevIdx];

      if (
        macdLineNow !== null &&
        macdSigNow !== null &&
        macdLinePrev !== null &&
        macdSigPrev !== null
      ) {
        // Bullish MACD Crossover
        if (macdLinePrev <= macdSigPrev && macdLineNow > macdSigNow) {
          const crossCandle = candles[idx];
          strategies.push({
            id: `${symbol}-${timeframe}-MACD_BULL_CROSS-${crossCandle.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STRATEGY",
            pattern: "MACD_CROSSOVER",
            name: "MACD Bullish Signal Cross",
            direction: "BULLISH",
            state: offset === 0 && latest.isOpen ? "DEVELOPING" : "CONFIRMED",
            firstDetectedAt: crossCandle.isoTime,
            lastUpdatedAt: latestIso,
            startTime: candles[prevIdx].timestamp,
            endTime: crossCandle.timestamp,
            latestStructuralTimestamp: latestTs,
            keyPoints: [{ label: "MACD Cross", timestamp: crossCandle.timestamp, price: crossCandle.close }],
            levels: {
              entry: crossCandle.close,
              stopLoss: crossCandle.low - currentAtr * 0.5,
              target1: crossCandle.close + currentAtr * 1.8,
            },
            progress: {
              percentage: 100,
              description: `MACD Line (${macdLineNow.toFixed(2)}) crossed above Signal Line (${macdSigNow.toFixed(2)}): Bullish momentum expansion`,
            },
          });
          break;
        }
        // Bearish MACD Crossover
        else if (macdLinePrev >= macdSigPrev && macdLineNow < macdSigNow) {
          const crossCandle = candles[idx];
          strategies.push({
            id: `${symbol}-${timeframe}-MACD_BEAR_CROSS-${crossCandle.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STRATEGY",
            pattern: "MACD_CROSSOVER",
            name: "MACD Bearish Signal Cross",
            direction: "BEARISH",
            state: offset === 0 && latest.isOpen ? "DEVELOPING" : "CONFIRMED",
            firstDetectedAt: crossCandle.isoTime,
            lastUpdatedAt: latestIso,
            startTime: candles[prevIdx].timestamp,
            endTime: crossCandle.timestamp,
            latestStructuralTimestamp: latestTs,
            keyPoints: [{ label: "MACD Cross", timestamp: crossCandle.timestamp, price: crossCandle.close }],
            levels: {
              entry: crossCandle.close,
              stopLoss: crossCandle.high + currentAtr * 0.5,
              target1: crossCandle.close - currentAtr * 1.8,
            },
            progress: {
              percentage: 100,
              description: `MACD Line (${macdLineNow.toFixed(2)}) crossed below Signal Line (${macdSigNow.toFixed(2)}): Bearish momentum acceleration`,
            },
          });
          break;
        }
      }
    }

    // =========================================================================
    // 4. RSI OVERSOLD (<30) BOUNCE & OVERBOUGHT (>70) REVERSAL (Active within last 3 bars)
    // =========================================================================
    for (let offset = 0; offset < Math.min(3, n - 2); offset++) {
      const idx = n - 1 - offset;
      const prevIdx = idx - 1;
      const rsiNow = rsi[idx];
      const rsiPrev = rsi[prevIdx];

      if (rsiNow !== null && rsiPrev !== null) {
        // Bullish RSI Oversold Exit (crossed back above 30)
        if (rsiPrev <= 30 && rsiNow > 30) {
          const revCandle = candles[idx];
          strategies.push({
            id: `${symbol}-${timeframe}-RSI_OVERSOLD_REVERSAL-${revCandle.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STRATEGY",
            pattern: "RSI_REVERSAL",
            name: "RSI Oversold Bounce (>30)",
            direction: "BULLISH",
            state: "CONFIRMED",
            firstDetectedAt: revCandle.isoTime,
            lastUpdatedAt: latestIso,
            startTime: candles[prevIdx].timestamp,
            endTime: revCandle.timestamp,
            latestStructuralTimestamp: latestTs,
            keyPoints: [{ label: `RSI ${rsiNow.toFixed(1)}`, timestamp: revCandle.timestamp, price: revCandle.low }],
            levels: {
              entry: revCandle.close,
              stopLoss: revCandle.low - currentAtr * 0.6,
              target1: revCandle.close + currentAtr * 2,
            },
            progress: {
              percentage: 100,
              description: `RSI recovered from oversold territory (${rsiPrev.toFixed(1)} -> ${rsiNow.toFixed(1)}): High-probability mean reversion`,
            },
          });
          break;
        }
        // Bearish RSI Overbought Exit (crossed back below 70)
        else if (rsiPrev >= 70 && rsiNow < 70) {
          const revCandle = candles[idx];
          strategies.push({
            id: `${symbol}-${timeframe}-RSI_OVERBOUGHT_REVERSAL-${revCandle.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STRATEGY",
            pattern: "RSI_REVERSAL",
            name: "RSI Overbought Reversal (<70)",
            direction: "BEARISH",
            state: "CONFIRMED",
            firstDetectedAt: revCandle.isoTime,
            lastUpdatedAt: latestIso,
            startTime: candles[prevIdx].timestamp,
            endTime: revCandle.timestamp,
            latestStructuralTimestamp: latestTs,
            keyPoints: [{ label: `RSI ${rsiNow.toFixed(1)}`, timestamp: revCandle.timestamp, price: revCandle.high }],
            levels: {
              entry: revCandle.close,
              stopLoss: revCandle.high + currentAtr * 0.6,
              target1: revCandle.close - currentAtr * 2,
            },
            progress: {
              percentage: 100,
              description: `RSI cooled down from overbought extreme (${rsiPrev.toFixed(1)} -> ${rsiNow.toFixed(1)}): Bearish pullback signal`,
            },
          });
          break;
        }
      }
    }

    // =========================================================================
    // 5. SUPERTREND TREND FLIP STRATEGY (10, 3 ATR) (Active within last 3 bars)
    // =========================================================================
    for (let offset = 0; offset < Math.min(3, n - 2); offset++) {
      const idx = n - 1 - offset;
      const prevIdx = idx - 1;
      const stTrendNow = supertrend.trend[idx];
      const stTrendPrev = supertrend.trend[prevIdx];
      const stValNow = supertrend.supertrend[idx];

      if (stTrendNow && stTrendPrev && stTrendNow !== stTrendPrev && stValNow !== null) {
        const isBull = stTrendNow === "BULLISH";
        const triggerCandle = candles[idx];
        strategies.push({
          id: `${symbol}-${timeframe}-SUPERTREND_FLIP-${triggerCandle.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "STRATEGY",
          pattern: "SUPERTREND_FLIP",
          name: isBull ? "Supertrend Bullish Turn" : "Supertrend Bearish Turn",
          direction: isBull ? "BULLISH" : "BEARISH",
          state: "CONFIRMED",
          firstDetectedAt: triggerCandle.isoTime,
          lastUpdatedAt: latestIso,
          startTime: candles[prevIdx].timestamp,
          endTime: triggerCandle.timestamp,
          latestStructuralTimestamp: latestTs,
          keyPoints: [
            { label: isBull ? "Bullish Stop" : "Bearish Stop", timestamp: triggerCandle.timestamp, price: stValNow },
            { label: "Trigger Candle", timestamp: triggerCandle.timestamp, price: triggerCandle.close },
          ],
          levels: {
            entry: triggerCandle.close,
            stopLoss: stValNow,
            target1: isBull ? triggerCandle.close + currentAtr * 2.5 : triggerCandle.close - currentAtr * 2.5,
          },
          progress: {
            percentage: 100,
            description: `Supertrend flipped to ${isBull ? "BULLISH (Green)" : "BEARISH (Red)"} trailing stop at $${stValNow.toFixed(1)}`,
          },
        });
        break;
      }
    }

    // =========================================================================
    // 6. BOLLINGER BAND + RSI CONFLUENCE MEAN REVERSION
    // =========================================================================
    const bbUpper = bb.upper[n - 1];
    const bbLower = bb.lower[n - 1];
    const bbMid = bb.middle[n - 1];
    const rsiVal = rsi[n - 1];

    if (bbUpper !== null && bbLower !== null && bbMid !== null && rsiVal !== null) {
      // Bullish Mean Reversion: Price pierced or touched Lower Bollinger Band AND RSI <= 35
      if (latest.low <= bbLower * 1.001 && rsiVal <= 35) {
        strategies.push({
          id: `${symbol}-${timeframe}-BB_RSI_BULL_CONFLUENCE-${latestTs}`,
          instrument: symbol,
          timeframe,
          family: "STRATEGY",
          pattern: "BB_RSI_CONFLUENCE",
          name: "Bollinger Lower Band + RSI Dip Buy",
          direction: "BULLISH",
          state: "DEVELOPING",
          firstDetectedAt: latestIso,
          lastUpdatedAt: latestIso,
          startTime: candles[Math.max(0, n - 3)].timestamp,
          endTime: latestTs,
          latestStructuralTimestamp: latestTs,
          keyPoints: [
            { label: "Lower Band", timestamp: latestTs, price: bbLower },
            { label: "Candle Low", timestamp: latestTs, price: latest.low },
          ],
          levels: {
            entry: latest.close,
            stopLoss: bbLower - currentAtr * 0.8,
            target1: bbMid,
          },
          progress: {
            percentage: 80,
            description: `Price tested 2-sigma lower band ($${bbLower.toFixed(1)}) with RSI at ${rsiVal.toFixed(1)} (Oversold): High-confluence mean reversion buy setup`,
          },
        });
      }
      // Bearish Mean Reversion: Price pierced or touched Upper Bollinger Band AND RSI >= 65
      else if (latest.high >= bbUpper * 0.999 && rsiVal >= 65) {
        strategies.push({
          id: `${symbol}-${timeframe}-BB_RSI_BEAR_CONFLUENCE-${latestTs}`,
          instrument: symbol,
          timeframe,
          family: "STRATEGY",
          pattern: "BB_RSI_CONFLUENCE",
          name: "Bollinger Upper Band + RSI Rejection",
          direction: "BEARISH",
          state: "DEVELOPING",
          firstDetectedAt: latestIso,
          lastUpdatedAt: latestIso,
          startTime: candles[Math.max(0, n - 3)].timestamp,
          endTime: latestTs,
          latestStructuralTimestamp: latestTs,
          keyPoints: [
            { label: "Upper Band", timestamp: latestTs, price: bbUpper },
            { label: "Candle High", timestamp: latestTs, price: latest.high },
          ],
          levels: {
            entry: latest.close,
            stopLoss: bbUpper + currentAtr * 0.8,
            target1: bbMid,
          },
          progress: {
            percentage: 80,
            description: `Price tested 2-sigma upper band ($${bbUpper.toFixed(1)}) with RSI at ${rsiVal.toFixed(1)} (Overbought): High-confluence mean reversion sell setup`,
          },
        });
      }
    }

    return strategies;
  }
}
