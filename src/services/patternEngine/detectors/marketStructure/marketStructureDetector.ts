import { OHLCV, SupportedTimeframe } from "../../types/candle";
import { SwingPoint } from "../../core/swingDetector";
import { DetectedPattern } from "../../types/pattern";

export class MarketStructureDetector {
  public detect(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    timeframe: SupportedTimeframe,
    symbol: string = "XAUUSD",
    activeOnly: boolean = true
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    if (swings.length < 1 || candles.length < 5) return patterns;

    const highs = swings.filter((s) => s.type === "HIGH");
    const lows = swings.filter((s) => s.type === "LOW");

    // Active Swing High & Low Pivots
    if (highs.length > 0) {
      const sh = highs[highs.length - 1];
      patterns.push({
        id: `${symbol}-${timeframe}-SWING_HIGH-${sh.timestamp}`,
        instrument: symbol,
        timeframe,
        family: "MARKET_STRUCTURE",
        pattern: "SWING_HIGH",
        name: "Swing High Resistance",
        direction: "BEARISH",
        state: sh.isProvisional ? "DEVELOPING" : "CONFIRMED",
        firstDetectedAt: sh.isoTime,
        lastUpdatedAt: sh.isoTime,
        startTime: sh.timestamp,
        endTime: sh.timestamp,
        latestStructuralTimestamp: sh.timestamp,
        keyPoints: [{ label: "Swing High", timestamp: sh.timestamp, price: sh.price, isProvisional: sh.isProvisional }],
        levels: { resistanceLevel: sh.price },
        progress: { percentage: 100, description: "Structural swing high pivot level" },
      });
    }
    if (lows.length > 0) {
      const sl = lows[lows.length - 1];
      patterns.push({
        id: `${symbol}-${timeframe}-SWING_LOW-${sl.timestamp}`,
        instrument: symbol,
        timeframe,
        family: "MARKET_STRUCTURE",
        pattern: "SWING_LOW",
        name: "Swing Low Support",
        direction: "BULLISH",
        state: sl.isProvisional ? "DEVELOPING" : "CONFIRMED",
        firstDetectedAt: sl.isoTime,
        lastUpdatedAt: sl.isoTime,
        startTime: sl.timestamp,
        endTime: sl.timestamp,
        latestStructuralTimestamp: sl.timestamp,
        keyPoints: [{ label: "Swing Low", timestamp: sl.timestamp, price: sl.price, isProvisional: sl.isProvisional }],
        levels: { supportLevel: sl.price },
        progress: { percentage: 100, description: "Structural swing low pivot level" },
      });
    }

    // 1. Current Active Higher Highs / Lower Highs
    const startHighIdx = activeOnly ? Math.max(1, highs.length - 1) : 1;
    for (let i = startHighIdx; i < highs.length; i++) {
      const prev = highs[i - 1];
      const curr = highs[i];
      if (curr.price > prev.price) {
        patterns.push({
          id: `${symbol}-${timeframe}-HH-${curr.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "MARKET_STRUCTURE",
          pattern: "HIGHER_HIGH",
          name: "Higher High (HH)",
          direction: "BULLISH",
          state: curr.isProvisional ? "DEVELOPING" : "CONFIRMED",
          firstDetectedAt: curr.isoTime,
          lastUpdatedAt: curr.isoTime,
          startTime: prev.timestamp,
          endTime: curr.timestamp,
          keyPoints: [
            { label: "Prior High", timestamp: prev.timestamp, price: prev.price },
            { label: "New High", timestamp: curr.timestamp, price: curr.price, isProvisional: curr.isProvisional },
          ],
          levels: { resistanceLevel: curr.price, supportLevel: prev.price },
          progress: { percentage: 100, description: "Bullish sequence: New higher peak established" },
        });
      } else if (curr.price < prev.price) {
        patterns.push({
          id: `${symbol}-${timeframe}-LH-${curr.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "MARKET_STRUCTURE",
          pattern: "LOWER_HIGH",
          name: "Lower High (LH)",
          direction: "BEARISH",
          state: curr.isProvisional ? "DEVELOPING" : "CONFIRMED",
          firstDetectedAt: curr.isoTime,
          lastUpdatedAt: curr.isoTime,
          startTime: prev.timestamp,
          endTime: curr.timestamp,
          keyPoints: [
            { label: "Prior High", timestamp: prev.timestamp, price: prev.price },
            { label: "Lower High", timestamp: curr.timestamp, price: curr.price, isProvisional: curr.isProvisional },
          ],
          levels: { resistanceLevel: curr.price },
          progress: { percentage: 100, description: "Bearish sequence: Failed to exceed previous high" },
        });
      }
    }

    // Current Active Higher Lows / Lower Lows
    const startLowIdx = activeOnly ? Math.max(1, lows.length - 1) : 1;
    for (let i = startLowIdx; i < lows.length; i++) {
      const prev = lows[i - 1];
      const curr = lows[i];
      if (curr.price > prev.price) {
        patterns.push({
          id: `${symbol}-${timeframe}-HL-${curr.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "MARKET_STRUCTURE",
          pattern: "HIGHER_LOW",
          name: "Higher Low (HL)",
          direction: "BULLISH",
          state: curr.isProvisional ? "DEVELOPING" : "CONFIRMED",
          firstDetectedAt: curr.isoTime,
          lastUpdatedAt: curr.isoTime,
          startTime: prev.timestamp,
          endTime: curr.timestamp,
          keyPoints: [
            { label: "Prior Low", timestamp: prev.timestamp, price: prev.price },
            { label: "Higher Low", timestamp: curr.timestamp, price: curr.price, isProvisional: curr.isProvisional },
          ],
          levels: { supportLevel: curr.price },
          progress: { percentage: 100, description: "Bullish sequence: Higher floor defended" },
        });
      } else if (curr.price < prev.price) {
        patterns.push({
          id: `${symbol}-${timeframe}-LL-${curr.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "MARKET_STRUCTURE",
          pattern: "LOWER_LOW",
          name: "Lower Low (LL)",
          direction: "BEARISH",
          state: curr.isProvisional ? "DEVELOPING" : "CONFIRMED",
          firstDetectedAt: curr.isoTime,
          lastUpdatedAt: curr.isoTime,
          startTime: prev.timestamp,
          endTime: curr.timestamp,
          keyPoints: [
            { label: "Prior Low", timestamp: prev.timestamp, price: prev.price },
            { label: "Lower Low", timestamp: curr.timestamp, price: curr.price, isProvisional: curr.isProvisional },
          ],
          levels: { supportLevel: curr.price },
          progress: { percentage: 100, description: "Bearish sequence: Lower valley established" },
        });
      }
    }

    // 2. Break of Structure (BOS) & Change of Character (CHoCH)
    const latestCandle = candles[candles.length - 1];
    const recentHigh = highs[highs.length - 1];
    const recentLow = lows[lows.length - 1];

    // CHoCH (Change of Character) & BOS
    if (highs.length >= 2 && lows.length >= 2) {
      const prevHigh = highs[highs.length - 2];
      const prevLow = lows[lows.length - 2];

      // If prior trend was bearish (prevHigh > recentHigh) and latest breaks above recentHigh -> CHoCH
      if (prevHigh.price > recentHigh.price && latestCandle.close > recentHigh.price) {
        patterns.push({
          id: `${symbol}-${timeframe}-BULLISH_CHOCH-${latestCandle.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "MARKET_STRUCTURE",
          pattern: "BULLISH_CHOCH",
          name: "Bullish Change of Character (CHoCH)",
          direction: "BULLISH",
          state: latestCandle.isOpen ? "DEVELOPING" : "CONFIRMED",
          firstDetectedAt: latestCandle.isoTime,
          lastUpdatedAt: latestCandle.isoTime,
          startTime: recentHigh.timestamp,
          endTime: latestCandle.timestamp,
          latestStructuralTimestamp: latestCandle.timestamp,
          keyPoints: [
            { label: "Lower High", timestamp: recentHigh.timestamp, price: recentHigh.price },
            { label: "Breakout", timestamp: latestCandle.timestamp, price: latestCandle.close },
          ],
          levels: { breakoutLevel: recentHigh.price, stopLoss: recentLow?.price ?? recentHigh.price * 0.995 },
          progress: { percentage: 100, description: "Bearish structure broken: Early trend reversal signal" },
        });
      }

      // If prior trend was bullish (prevLow < recentLow) and latest breaks below recentLow -> Bearish CHoCH
      if (prevLow.price < recentLow.price && latestCandle.close < recentLow.price) {
        patterns.push({
          id: `${symbol}-${timeframe}-BEARISH_CHOCH-${latestCandle.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "MARKET_STRUCTURE",
          pattern: "BEARISH_CHOCH",
          name: "Bearish Change of Character (CHoCH)",
          direction: "BEARISH",
          state: latestCandle.isOpen ? "DEVELOPING" : "CONFIRMED",
          firstDetectedAt: latestCandle.isoTime,
          lastUpdatedAt: latestCandle.isoTime,
          startTime: recentLow.timestamp,
          endTime: latestCandle.timestamp,
          latestStructuralTimestamp: latestCandle.timestamp,
          keyPoints: [
            { label: "Higher Low", timestamp: recentLow.timestamp, price: recentLow.price },
            { label: "Breakdown", timestamp: latestCandle.timestamp, price: latestCandle.close },
          ],
          levels: { breakoutLevel: recentLow.price, stopLoss: recentHigh?.price ?? recentLow.price * 1.005 },
          progress: { percentage: 100, description: "Bullish structure broken: Early trend reversal signal" },
        });
      }
    }

    if (recentHigh && latestCandle.close > recentHigh.price) {
      patterns.push({
        id: `${symbol}-${timeframe}-BULLISH_BOS-${latestCandle.timestamp}`,
        instrument: symbol,
        timeframe,
        family: "MARKET_STRUCTURE",
        pattern: "BULLISH_BOS",
        name: "Bullish Break of Structure (BOS)",
        direction: "BULLISH",
        state: latestCandle.isOpen ? "DEVELOPING" : "CONFIRMED",
        firstDetectedAt: latestCandle.isoTime,
        lastUpdatedAt: latestCandle.isoTime,
        startTime: recentHigh.timestamp,
        endTime: latestCandle.timestamp,
        keyPoints: [
          { label: "Broken High", timestamp: recentHigh.timestamp, price: recentHigh.price },
          { label: "Breakout Candle", timestamp: latestCandle.timestamp, price: latestCandle.close },
        ],
        levels: {
          breakoutLevel: recentHigh.price,
          target1: latestCandle.close + (latestCandle.close - (recentLow?.price ?? recentHigh.price * 0.99)),
          stopLoss: recentLow?.price ?? recentHigh.price * 0.995,
        },
        progress: {
          percentage: latestCandle.isOpen ? 85 : 100,
          description: "Close price cleared the previous structural swing high",
        },
      });
    }

    if (recentLow && latestCandle.close < recentLow.price) {
      patterns.push({
        id: `${symbol}-${timeframe}-BEARISH_BOS-${latestCandle.timestamp}`,
        instrument: symbol,
        timeframe,
        family: "MARKET_STRUCTURE",
        pattern: "BEARISH_BOS",
        name: "Bearish Break of Structure (BOS)",
        direction: "BEARISH",
        state: latestCandle.isOpen ? "DEVELOPING" : "CONFIRMED",
        firstDetectedAt: latestCandle.isoTime,
        lastUpdatedAt: latestCandle.isoTime,
        startTime: recentLow.timestamp,
        endTime: latestCandle.timestamp,
        keyPoints: [
          { label: "Broken Low", timestamp: recentLow.timestamp, price: recentLow.price },
          { label: "Breakout Candle", timestamp: latestCandle.timestamp, price: latestCandle.close },
        ],
        levels: {
          breakoutLevel: recentLow.price,
          target1: latestCandle.close - ((recentHigh?.price ?? recentLow.price * 1.01) - latestCandle.close),
          stopLoss: recentHigh?.price ?? recentLow.price * 1.005,
        },
        progress: {
          percentage: latestCandle.isOpen ? 85 : 100,
          description: "Close price broke beneath the previous structural swing low",
        },
      });
    }

    // 3. Liquidity Sweeps
    // A candle wicks past a swing point but closes back within it
    const sweepLookback = activeOnly ? 2 : 10;
    for (let cIdx = Math.max(0, candles.length - sweepLookback); cIdx < candles.length; cIdx++) {
      const c = candles[cIdx];
      // Bullish Liquidity Sweep (Swept Low)
      for (const low of lows) {
        if (c.timestamp > low.timestamp && c.low < low.price && c.close > low.price && c.open > low.price) {
          patterns.push({
            id: `${symbol}-${timeframe}-SWEEP_LOW-${c.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "MARKET_STRUCTURE",
            pattern: "BULLISH_LIQUIDITY_SWEEP",
            name: "Bullish Liquidity Sweep",
            direction: "BULLISH",
            state: "CONFIRMED",
            firstDetectedAt: c.isoTime,
            lastUpdatedAt: c.isoTime,
            startTime: low.timestamp,
            endTime: c.timestamp,
            keyPoints: [
              { label: "Swept Low", timestamp: low.timestamp, price: low.price },
              { label: "Sweep Candle", timestamp: c.timestamp, price: c.low },
            ],
            levels: {
              entry: c.close,
              stopLoss: c.low,
              target1: c.close + (c.close - c.low) * 2,
            },
            progress: { percentage: 100, description: "Stop-run below swing low rejected and closed back inside" },
          });
          break;
        }
      }

      // Bearish Liquidity Sweep (Swept High)
      for (const high of highs) {
        if (c.timestamp > high.timestamp && c.high > high.price && c.close < high.price && c.open < high.price) {
          patterns.push({
            id: `${symbol}-${timeframe}-SWEEP_HIGH-${c.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "MARKET_STRUCTURE",
            pattern: "BEARISH_LIQUIDITY_SWEEP",
            name: "Bearish Liquidity Sweep",
            direction: "BEARISH",
            state: "CONFIRMED",
            firstDetectedAt: c.isoTime,
            lastUpdatedAt: c.isoTime,
            startTime: high.timestamp,
            endTime: c.timestamp,
            keyPoints: [
              { label: "Swept High", timestamp: high.timestamp, price: high.price },
              { label: "Sweep Candle", timestamp: c.timestamp, price: c.high },
            ],
            levels: {
              entry: c.close,
              stopLoss: c.high,
              target1: c.close - (c.high - c.close) * 2,
            },
            progress: { percentage: 100, description: "Buy-stops swept above swing high before aggressive rejection" },
          });
          break;
        }
      }
    }

    return patterns;
  }
}
