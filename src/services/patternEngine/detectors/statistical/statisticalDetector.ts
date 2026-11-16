import { OHLCV, SupportedTimeframe } from "../../types/candle";
import {
  calculateATR,
  calculateBollingerBands,
  calculateKeltnerChannels,
  calculateMACD,
  calculateRSI,
} from "../../core/indicators";
import { SwingPoint } from "../../core/swingDetector";
import { DetectedPattern } from "../../types/pattern";

export class StatisticalPatternDetector {
  public detect(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    timeframe: SupportedTimeframe,
    symbol: string = "XAUUSD"
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const n = candles.length;
    if (n < 35) return patterns;

    const bb = calculateBollingerBands(candles as OHLCV[], 20, 2);
    const kc = calculateKeltnerChannels(candles as OHLCV[], 20, 10, 1.5);
    const rsi = calculateRSI(candles as OHLCV[], 14);
    const macd = calculateMACD(candles as OHLCV[], 12, 26, 9);
    const atr = calculateATR(candles as OHLCV[], 14);

    const latest = candles[n - 1];
    const prev = candles[n - 2];

    // 1. Bollinger Band Squeeze (Inside Keltner Channel)
    const bbUpper = bb.upper[n - 1];
    const bbLower = bb.lower[n - 1];
    const kcUpper = kc.upper[n - 1];
    const kcLower = kc.lower[n - 1];

    if (bbUpper !== null && bbLower !== null && kcUpper !== null && kcLower !== null) {
      const isSqueezed = bbUpper < kcUpper && bbLower > kcLower;
      const prevBbUpper = bb.upper[n - 2];
      const prevKcUpper = kc.upper[n - 2];
      const wasSqueezed = prevBbUpper !== null && prevKcUpper !== null && prevBbUpper < prevKcUpper;

      if (isSqueezed) {
        patterns.push({
          id: `${symbol}-${timeframe}-BB_SQUEEZE-${latest.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "STATISTICAL",
          pattern: "BOLLINGER_BAND_SQUEEZE",
          name: "Bollinger Band Squeeze",
          direction: "NEUTRAL",
          state: "DEVELOPING",
          firstDetectedAt: latest.isoTime,
          lastUpdatedAt: latest.isoTime,
          startTime: latest.timestamp,
          endTime: latest.timestamp,
          keyPoints: [
            { label: "Upper BB", timestamp: latest.timestamp, price: bbUpper },
            { label: "Lower BB", timestamp: latest.timestamp, price: bbLower },
          ],
          levels: { upperBoundary: bbUpper, lowerBoundary: bbLower },
          progress: { percentage: 75, description: "Volatility compression: BB bands trading inside Keltner Channel" },
          metadata: { bandwidth: bb.bandwidth[n - 1] },
        });
      } else if (wasSqueezed && !isSqueezed) {
        // Breakout from squeeze
        const isBullish = latest.close > (bb.middle[n - 1] ?? latest.close);
        patterns.push({
          id: `${symbol}-${timeframe}-SQUEEZE_BREAKOUT-${latest.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "STATISTICAL",
          pattern: isBullish ? "BULLISH_CHANNEL_BREAKOUT" : "BEARISH_CHANNEL_BREAKOUT",
          name: `${isBullish ? "Bullish" : "Bearish"} Squeeze Firing`,
          direction: isBullish ? "BULLISH" : "BEARISH",
          state: "CONFIRMED",
          firstDetectedAt: latest.isoTime,
          lastUpdatedAt: latest.isoTime,
          startTime: prev.timestamp,
          endTime: latest.timestamp,
          keyPoints: [{ label: "Breakout Candle", timestamp: latest.timestamp, price: latest.close }],
          levels: { entry: latest.close, stopLoss: bb.middle[n - 1] ?? latest.close },
          progress: { percentage: 100, description: "Confirmed: Volatility squeeze released into directional expansion" },
        });
      }
    }

    // 2. ATR Expansion & Contraction
    const currentAtr = atr[n - 1];
    const prevAtr = atr[n - 6]; // 5 bars ago
    if (currentAtr !== null && prevAtr !== null) {
      if (currentAtr > prevAtr * 1.35) {
        patterns.push({
          id: `${symbol}-${timeframe}-ATR_EXPANSION-${latest.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "STATISTICAL",
          pattern: "ATR_EXPANSION",
          name: "ATR Volatility Expansion",
          direction: "NEUTRAL",
          state: "CONFIRMED",
          firstDetectedAt: latest.isoTime,
          lastUpdatedAt: latest.isoTime,
          startTime: candles[n - 6].timestamp,
          endTime: latest.timestamp,
          keyPoints: [{ label: "Current ATR", timestamp: latest.timestamp, price: latest.close }],
          levels: {},
          progress: { percentage: 100, description: `ATR expanded +${(((currentAtr - prevAtr) / prevAtr) * 100).toFixed(1)}%` },
        });
      } else if (currentAtr < prevAtr * 0.7) {
        patterns.push({
          id: `${symbol}-${timeframe}-ATR_CONTRACTION-${latest.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "STATISTICAL",
          pattern: "ATR_CONTRACTION",
          name: "ATR Volatility Contraction",
          direction: "NEUTRAL",
          state: "DEVELOPING",
          firstDetectedAt: latest.isoTime,
          lastUpdatedAt: latest.isoTime,
          startTime: candles[n - 6].timestamp,
          endTime: latest.timestamp,
          keyPoints: [{ label: "Current ATR", timestamp: latest.timestamp, price: latest.close }],
          levels: {},
          progress: { percentage: 70, description: "Volatility contraction: Range tightening" },
        });
      }
    }

    // 3. RSI Divergence
    // Bullish RSI Divergence: Price Low 2 < Price Low 1, but RSI Low 2 > RSI Low 1
    const swingLows = swings.filter((s) => s.type === "LOW");
    if (swingLows.length >= 2) {
      const [l1, l2] = swingLows.slice(-2);
      const rsi1 = rsi[l1.index];
      const rsi2 = rsi[l2.index];
      if (rsi1 !== null && rsi2 !== null) {
        if (l2.price < l1.price && rsi2 > rsi1 && rsi1 < 40) {
          patterns.push({
            id: `${symbol}-${timeframe}-BULLISH_RSI_DIV-${l2.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STATISTICAL",
            pattern: "BULLISH_RSI_DIVERGENCE",
            name: "Bullish RSI Divergence",
            direction: "BULLISH",
            state: l2.isProvisional ? "DEVELOPING" : "CONFIRMED",
            firstDetectedAt: l1.isoTime,
            lastUpdatedAt: l2.isoTime,
            startTime: l1.timestamp,
            endTime: l2.timestamp,
            keyPoints: [
              { label: "Price Low 1", timestamp: l1.timestamp, price: l1.price },
              { label: "Price Low 2", timestamp: l2.timestamp, price: l2.price, isProvisional: l2.isProvisional },
            ],
            levels: { entry: latest.close, stopLoss: l2.price, target1: latest.close + (latest.close - l2.price) * 1.5 },
            progress: { percentage: 90, description: `Lower price low with higher RSI (${rsi1.toFixed(1)} -> ${rsi2.toFixed(1)})` },
            metadata: { rsi1: Number(rsi1.toFixed(1)), rsi2: Number(rsi2.toFixed(1)) },
          });
        }
      }
    }

    // Bearish RSI Divergence: Price High 2 > Price High 1, but RSI High 2 < RSI High 1
    const swingHighs = swings.filter((s) => s.type === "HIGH");
    if (swingHighs.length >= 2) {
      const [h1, h2] = swingHighs.slice(-2);
      const rsi1 = rsi[h1.index];
      const rsi2 = rsi[h2.index];
      if (rsi1 !== null && rsi2 !== null) {
        if (h2.price > h1.price && rsi2 < rsi1 && rsi1 > 60) {
          patterns.push({
            id: `${symbol}-${timeframe}-BEARISH_RSI_DIV-${h2.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STATISTICAL",
            pattern: "BEARISH_RSI_DIVERGENCE",
            name: "Bearish RSI Divergence",
            direction: "BEARISH",
            state: h2.isProvisional ? "DEVELOPING" : "CONFIRMED",
            firstDetectedAt: h1.isoTime,
            lastUpdatedAt: h2.isoTime,
            startTime: h1.timestamp,
            endTime: h2.timestamp,
            keyPoints: [
              { label: "Price High 1", timestamp: h1.timestamp, price: h1.price },
              { label: "Price High 2", timestamp: h2.timestamp, price: h2.price, isProvisional: h2.isProvisional },
            ],
            levels: { entry: latest.close, stopLoss: h2.price, target1: latest.close - (h2.price - latest.close) * 1.5 },
            progress: { percentage: 90, description: `Higher price high with lower RSI (${rsi1.toFixed(1)} -> ${rsi2.toFixed(1)})` },
            metadata: { rsi1: Number(rsi1.toFixed(1)), rsi2: Number(rsi2.toFixed(1)) },
          });
        }
      }
    }

    // 3. MACD Divergence
    if (swingLows.length >= 2) {
      const [l1, l2] = swingLows.slice(-2);
      const macd1 = macd.histogram[l1.index];
      const macd2 = macd.histogram[l2.index];
      if (macd1 !== null && macd2 !== null) {
        if (l2.price < l1.price && macd2 > macd1 && macd1 < 0) {
          const targetPrice = latest.close + Math.abs(l1.price - l2.price) * 1.5;
          patterns.push({
            id: `${symbol}-${timeframe}-BULLISH_MACD_DIV-${l2.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STATISTICAL",
            pattern: "BULLISH_MACD_DIVERGENCE",
            name: "Bullish MACD Divergence",
            direction: "BULLISH",
            state: l2.isProvisional ? "DEVELOPING" : "CONFIRMED",
            firstDetectedAt: l1.isoTime,
            lastUpdatedAt: l2.isoTime,
            startTime: l1.timestamp,
            endTime: l2.timestamp,
            latestStructuralTimestamp: l2.timestamp,
            keyPoints: [
              { label: "Price Low 1", timestamp: l1.timestamp, price: l1.price },
              { label: "Price Low 2", timestamp: l2.timestamp, price: l2.price, isProvisional: l2.isProvisional },
            ],
            projection: {
              projectedPoints: [
                { label: "MACD Target", timestamp: latest.timestamp + 6 * 300, price: targetPrice, type: "TARGET", isProjected: true },
              ],
              breakoutLevel: latest.close,
              invalidationLevel: l2.price,
              expectedBreakoutDirection: "BULLISH",
              description: "Bullish MACD momentum divergence. Lower price low with higher MACD histogram.",
            },
            completenessScore: 85,
            isDeveloping: l2.isProvisional,
            levels: { entry: latest.close, stopLoss: l2.price, target1: targetPrice },
            progress: { percentage: 85, description: "Lower price low with higher MACD momentum" },
          });
        }
      }
    }

    if (swingHighs.length >= 2) {
      const [h1, h2] = swingHighs.slice(-2);
      const macd1 = macd.histogram[h1.index];
      const macd2 = macd.histogram[h2.index];
      if (macd1 !== null && macd2 !== null) {
        if (h2.price > h1.price && macd2 < macd1 && macd1 > 0) {
          const targetPrice = latest.close - Math.abs(h2.price - h1.price) * 1.5;
          patterns.push({
            id: `${symbol}-${timeframe}-BEARISH_MACD_DIV-${h2.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "STATISTICAL",
            pattern: "BEARISH_MACD_DIVERGENCE",
            name: "Bearish MACD Divergence",
            direction: "BEARISH",
            state: h2.isProvisional ? "DEVELOPING" : "CONFIRMED",
            firstDetectedAt: h1.isoTime,
            lastUpdatedAt: h2.isoTime,
            startTime: h1.timestamp,
            endTime: h2.timestamp,
            latestStructuralTimestamp: h2.timestamp,
            keyPoints: [
              { label: "Price High 1", timestamp: h1.timestamp, price: h1.price },
              { label: "Price High 2", timestamp: h2.timestamp, price: h2.price, isProvisional: h2.isProvisional },
            ],
            projection: {
              projectedPoints: [
                { label: "MACD Target", timestamp: latest.timestamp + 6 * 300, price: targetPrice, type: "TARGET", isProjected: true },
              ],
              breakoutLevel: latest.close,
              invalidationLevel: h2.price,
              expectedBreakoutDirection: "BEARISH",
              description: "Bearish MACD momentum divergence. Higher price high with lower MACD histogram.",
            },
            completenessScore: 85,
            isDeveloping: h2.isProvisional,
            levels: { entry: latest.close, stopLoss: h2.price, target1: targetPrice },
            progress: { percentage: 85, description: "Higher price high with lower MACD momentum" },
          });
        }
      }
    }

    // 4. Mean Reversion Extremes
    const currentRsi = rsi[n - 1];
    if (currentRsi !== null) {
      if (currentRsi > 78) {
        patterns.push({
          id: `${symbol}-${timeframe}-OVERBOUGHT_EXTREME-${latest.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "STATISTICAL",
          pattern: "MEAN_REVERSION_EXTREME",
          name: "Overbought Mean Reversion Extreme",
          direction: "BEARISH",
          state: "CONFIRMED",
          firstDetectedAt: latest.isoTime,
          lastUpdatedAt: latest.isoTime,
          startTime: latest.timestamp,
          endTime: latest.timestamp,
          keyPoints: [{ label: "Overbought Extreme", timestamp: latest.timestamp, price: latest.high }],
          levels: { entry: latest.close, target1: bb.middle[n - 1] ?? latest.close },
          progress: { percentage: 100, description: `RSI reached extreme overbought reading of ${currentRsi.toFixed(1)}` },
        });
      } else if (currentRsi < 22) {
        patterns.push({
          id: `${symbol}-${timeframe}-OVERSOLD_EXTREME-${latest.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "STATISTICAL",
          pattern: "MEAN_REVERSION_EXTREME",
          name: "Oversold Mean Reversion Extreme",
          direction: "BULLISH",
          state: "CONFIRMED",
          firstDetectedAt: latest.isoTime,
          lastUpdatedAt: latest.isoTime,
          startTime: latest.timestamp,
          endTime: latest.timestamp,
          keyPoints: [{ label: "Oversold Extreme", timestamp: latest.timestamp, price: latest.low }],
          levels: { entry: latest.close, target1: bb.middle[n - 1] ?? latest.close },
          progress: { percentage: 100, description: `RSI reached extreme oversold reading of ${currentRsi.toFixed(1)}` },
        });
      }
    }

    return patterns;
  }
}
