import { OHLCV, SupportedTimeframe, TIMEFRAMES } from "../../types/candle";
import { SwingPoint } from "../../core/swingDetector";
import {
  DetectedPattern,
  FutureProjection,
  PatternLifecycleState,
  ProjectedLine,
  ProjectedPoint,
} from "../../types/pattern";

export class ClassicalPatternDetector {
  public detect(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    timeframe: SupportedTimeframe,
    symbol: string = "XAUUSD",
    activeOnly: boolean = true
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    if (candles.length < 5) return patterns;

    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;
    const currentHigh = currentCandle.high;
    const currentLow = currentCandle.low;

    // Helper for timeframe bar duration
    const tfDef = TIMEFRAMES.find((t) => t.id === timeframe);
    const stepSec = (tfDef ? tfDef.minutes : 5) * 60;

    // (Cup and Handle detection removed per user request)

    // 2. Head and Shoulders & Inverse H&S (Forming -> Developing -> Confirmed)
    if (swings.length >= 3) {
      const minSwing = activeOnly ? Math.max(0, swings.length - 6) : 0;
      for (let i = minSwing; i <= swings.length - 3; i++) {
        const window = swings.slice(i, i + 5);
        const hs = this.checkHeadAndShoulders(window, currentCandle, symbol, timeframe, stepSec);
        if (hs) patterns.push(hs);

        const ihs = this.checkInverseHeadAndShoulders(window, currentCandle, symbol, timeframe, stepSec);
        if (ihs) patterns.push(ihs);
      }
    }

    // 3. Double Tops & Bottoms (Forming Retest -> Developing -> Confirmed)
    if (swings.length >= 2) {
      const minDoubleStart = activeOnly ? Math.max(0, swings.length - 4) : 0;
      for (let i = minDoubleStart; i <= swings.length - 2; i++) {
        const window = swings.slice(i, i + 4);
        const dt = this.checkDoubleTop(window, currentCandle, symbol, timeframe, stepSec);
        if (dt) patterns.push(dt);

        const db = this.checkDoubleBottom(window, currentCandle, symbol, timeframe, stepSec);
        if (db) patterns.push(db);
      }
    }

    // 4. Triple Tops & Bottoms (Forming 3rd Retest -> Developing -> Confirmed)
    if (swings.length >= 4) {
      const minTripleStart = activeOnly ? Math.max(0, swings.length - 6) : 0;
      for (let i = minTripleStart; i <= swings.length - 4; i++) {
        const window = swings.slice(i, i + 6);
        const tt = this.checkTripleTop(window, currentCandle, symbol, timeframe, stepSec);
        if (tt) patterns.push(tt);

        const tb = this.checkTripleBottom(window, currentCandle, symbol, timeframe, stepSec);
        if (tb) patterns.push(tb);
      }
    }

    // 5. Triangles, Wedges, & Broadening Formations
    if (swings.length >= 4) {
      const minTriStart = activeOnly ? Math.max(0, swings.length - 5) : 0;
      for (let i = minTriStart; i <= swings.length - 4; i++) {
        const window = swings.slice(i, i + 6);
        const tri = this.checkTrianglesAndWedges(window, currentCandle, symbol, timeframe, stepSec);
        if (tri) patterns.push(tri);

        const wedge = this.checkWedges(window, currentCandle, symbol, timeframe, stepSec);
        if (wedge) patterns.push(wedge);

        const broadening = this.checkBroadeningFormations(window, currentCandle, symbol, timeframe, stepSec);
        if (broadening) patterns.push(broadening);
      }
    }

    // 6. Flags & Pennants (Impulse + Consolidation + Continuation Projection)
    const flagsAndPennants = this.checkFlagAndPennants(candles, swings, currentPrice, symbol, timeframe, stepSec);
    patterns.push(...flagsAndPennants);

    // 7. Rounding Top & Rounding Bottom (Saucer & Dome)
    const roundings = this.checkRoundingTopAndBottom(candles, currentCandle, symbol, timeframe, stepSec);
    patterns.push(...roundings);

    return patterns;
  }

  // =========================================================================
  // 2. HEAD AND SHOULDERS
  // =========================================================================
  private checkHeadAndShoulders(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 3) return null;

    const currentPrice = currentCandle.close;
    const currentHigh = currentCandle.high;
    const latestTs = currentCandle.timestamp;

    // 5-point H&S
    if (w.length >= 5) {
      const [p1, p2, p3, p4, p5] = w;
      if (p1.type === "HIGH" && p2.type === "LOW" && p3.type === "HIGH" && p4.type === "LOW" && p5.type === "HIGH") {
        if (p3.price > p1.price && p3.price > p5.price) {
          const shoulderDiff = Math.abs(p1.price - p5.price) / p1.price;
          if (shoulderDiff <= 0.06) {
            const necklinePrice = (p2.price + p4.price) / 2;
            const patternHeight = p3.price - necklinePrice;
            const targetPrice = necklinePrice - patternHeight;

            let state: PatternLifecycleState = p5.isProvisional ? "FORMING" : "DEVELOPING";
            if (currentPrice < necklinePrice) state = "CONFIRMED";
            if (currentHigh > p3.price) state = "INVALIDATED";

            const estBreakdownTs = latestTs + 4 * stepSec;
            const estTargetTs = estBreakdownTs + 8 * stepSec;

            const projectedPoints: ProjectedPoint[] = [];
            if (p5.isProvisional) {
              projectedPoints.push({
                label: "Est. Right Shoulder",
                timestamp: latestTs + 2 * stepSec,
                price: p1.price,
                type: "ESTIMATED_POINT",
                isProjected: true,
              });
            }
            projectedPoints.push(
              { label: "Neckline Breakdown", timestamp: estBreakdownTs, price: necklinePrice, type: "BREAKOUT", isProjected: true },
              { label: "Target (H-Depth)", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true }
            );

            const projection: FutureProjection = {
              projectedPoints,
              projectedLines: [
                { from: { timestamp: p4.timestamp, price: necklinePrice }, to: { timestamp: estBreakdownTs + 6 * stepSec, price: necklinePrice }, style: "dashed", label: "Neckline" },
                { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estBreakdownTs, price: necklinePrice }, style: "dashed" },
                { from: { timestamp: estBreakdownTs, price: necklinePrice }, to: { timestamp: estTargetTs, price: targetPrice }, style: "dotted", label: "Target Move" },
              ],
              targetZone: { price: targetPrice, startTs: estBreakdownTs, endTs: estTargetTs + 4 * stepSec, label: `Measured Move: -$${patternHeight.toFixed(1)}` },
              breakoutLevel: necklinePrice,
              invalidationLevel: p3.price,
              expectedBreakoutDirection: "BEARISH",
              estimatedTimeToCompletion: state === "CONFIRMED" ? "Target underway" : "~4-6 bars",
              description: state === "CONFIRMED" ? "Confirmed breakdown below neckline!" : "Right shoulder completed. Awaiting neckline breakdown.",
            };

            return {
              id: `${symbol}-${timeframe}-HS-${p1.timestamp}`,
              instrument: symbol,
              timeframe,
              family: "CLASSICAL_CHART",
              pattern: "HEAD_AND_SHOULDERS",
              name: "Head and Shoulders",
              direction: "BEARISH",
              state,
              firstDetectedAt: p1.isoTime,
              lastUpdatedAt: currentCandle.isoTime,
              startTime: p1.timestamp,
              endTime: p5.timestamp,
              latestStructuralTimestamp: p5.timestamp,
              keyPoints: [
                { label: "Left Shoulder", timestamp: p1.timestamp, price: p1.price },
                { label: "Neckline 1", timestamp: p2.timestamp, price: p2.price },
                { label: "Head", timestamp: p3.timestamp, price: p3.price },
                { label: "Neckline 2", timestamp: p4.timestamp, price: p4.price },
                { label: "Right Shoulder", timestamp: p5.timestamp, price: p5.price, isProvisional: p5.isProvisional },
              ],
              projection,
              completenessScore: state === "CONFIRMED" ? 100 : p5.isProvisional ? 65 : 80,
              isDeveloping: state === "DEVELOPING" || state === "FORMING",
              levels: {
                entry: necklinePrice,
                neckline: necklinePrice,
                breakoutLevel: necklinePrice,
                target1: targetPrice,
                stopLoss: p3.price,
                invalidationLevel: p3.price,
              },
              progress: {
                percentage: state === "CONFIRMED" ? 100 : 80,
                description: state === "CONFIRMED" ? "Confirmed: Neckline breakdown" : "Right shoulder formed, awaiting breakdown",
              },
            };
          }
        }
      }
    }

    // 4-point FORMING right shoulder
    if (w.length >= 4) {
      const [p1, p2, p3, p4] = w;
      if (p1.type === "HIGH" && p2.type === "LOW" && p3.type === "HIGH" && p4.type === "LOW") {
        if (p3.price > p1.price && currentPrice < p3.price) {
          const estRightShoulderPrice = p1.price;
          const necklinePrice = (p2.price + p4.price) / 2;
          const patternHeight = p3.price - necklinePrice;
          const targetPrice = necklinePrice - patternHeight;

          const estRightShoulderTs = latestTs + 4 * stepSec;
          const estBreakdownTs = latestTs + 8 * stepSec;
          const estTargetTs = latestTs + 14 * stepSec;

          const projection: FutureProjection = {
            projectedPoints: [
              { label: "Est. Right Shoulder", timestamp: estRightShoulderTs, price: estRightShoulderPrice, type: "ESTIMATED_POINT", isProjected: true },
              { label: "Projected Neckline", timestamp: estBreakdownTs, price: necklinePrice, type: "BREAKOUT", isProjected: true },
              { label: "Target (H-Depth)", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true },
            ],
            projectedLines: [
              { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estRightShoulderTs, price: estRightShoulderPrice }, style: "dashed", label: "Right Shoulder Rally" },
              { from: { timestamp: estRightShoulderTs, price: estRightShoulderPrice }, to: { timestamp: estBreakdownTs, price: necklinePrice }, style: "dashed", label: "Neckline Retest" },
              { from: { timestamp: p2.timestamp, price: p2.price }, to: { timestamp: estBreakdownTs + 6 * stepSec, price: necklinePrice }, style: "dotted", label: "Neckline Extension" },
              { from: { timestamp: estBreakdownTs, price: necklinePrice }, to: { timestamp: estTargetTs, price: targetPrice }, style: "dotted", label: "Breakdown Target" },
            ],
            breakoutLevel: necklinePrice,
            invalidationLevel: p3.price,
            expectedBreakoutDirection: "BEARISH",
            estimatedTimeToCompletion: "~8-12 bars",
            description: "Forming Head & Shoulders. Head and neckline established; right shoulder rally developing.",
          };

          return {
            id: `${symbol}-${timeframe}-HS-${p1.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "CLASSICAL_CHART",
            pattern: "HEAD_AND_SHOULDERS",
            name: "Head and Shoulders",
            direction: "BEARISH",
            state: "FORMING",
            firstDetectedAt: p1.isoTime,
            lastUpdatedAt: currentCandle.isoTime,
            startTime: p1.timestamp,
            endTime: p4.timestamp,
            latestStructuralTimestamp: p4.timestamp,
            keyPoints: [
              { label: "Left Shoulder", timestamp: p1.timestamp, price: p1.price },
              { label: "Neckline 1", timestamp: p2.timestamp, price: p2.price },
              { label: "Head", timestamp: p3.timestamp, price: p3.price },
              { label: "Neckline 2", timestamp: p4.timestamp, price: p4.price },
            ],
            projection,
            completenessScore: 60,
            isDeveloping: true,
            levels: {
              entry: necklinePrice,
              neckline: necklinePrice,
              breakoutLevel: necklinePrice,
              target1: targetPrice,
              stopLoss: p3.price,
              invalidationLevel: p3.price,
            },
            progress: {
              percentage: 60,
              description: "Forming: Right shoulder rally in progress",
            },
          };
        }
      }
    }

    return null;
  }

  // =========================================================================
  // 3. INVERSE HEAD AND SHOULDERS
  // =========================================================================
  private checkInverseHeadAndShoulders(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 3) return null;
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    if (w.length >= 5) {
      const [p1, p2, p3, p4, p5] = w;
      if (p1.type === "LOW" && p2.type === "HIGH" && p3.type === "LOW" && p4.type === "HIGH" && p5.type === "LOW") {
        if (p3.price < p1.price && p3.price < p5.price) {
          const necklinePrice = (p2.price + p4.price) / 2;
          const patternHeight = necklinePrice - p3.price;
          const targetPrice = necklinePrice + patternHeight;

          let state: PatternLifecycleState = "DEVELOPING";
          if (currentPrice > necklinePrice) state = "CONFIRMED";
          if (currentPrice < p3.price) state = "INVALIDATED";

          const estBreakoutTs = latestTs + 4 * stepSec;
          const estTargetTs = estBreakoutTs + 8 * stepSec;

          const projection: FutureProjection = {
            projectedPoints: [
              { label: "Neckline Breakout", timestamp: estBreakoutTs, price: necklinePrice, type: "BREAKOUT", isProjected: true },
              { label: "Target (H-Depth)", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true },
            ],
            projectedLines: [
              { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estBreakoutTs, price: necklinePrice }, style: "dashed" },
              { from: { timestamp: estBreakoutTs, price: necklinePrice }, to: { timestamp: estTargetTs, price: targetPrice }, style: "dotted", label: "Breakout Target" },
            ],
            targetZone: { price: targetPrice, startTs: estBreakoutTs, endTs: estTargetTs + 4 * stepSec },
            breakoutLevel: necklinePrice,
            invalidationLevel: p3.price,
            expectedBreakoutDirection: "BULLISH",
            estimatedTimeToCompletion: state === "CONFIRMED" ? "Target underway" : "~4-6 bars",
            description: "Inverse Head & Shoulders right shoulder formed. Awaiting neckline breakout.",
          };

          return {
            id: `${symbol}-${timeframe}-IHS-${p1.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "CLASSICAL_CHART",
            pattern: "INVERSE_HEAD_AND_SHOULDERS",
            name: "Inverse Head and Shoulders",
            direction: "BULLISH",
            state,
            firstDetectedAt: p1.isoTime,
            lastUpdatedAt: currentCandle.isoTime,
            startTime: p1.timestamp,
            endTime: p5.timestamp,
            latestStructuralTimestamp: p5.timestamp,
            keyPoints: [
              { label: "Left Shoulder", timestamp: p1.timestamp, price: p1.price },
              { label: "Neckline 1", timestamp: p2.timestamp, price: p2.price },
              { label: "Head", timestamp: p3.timestamp, price: p3.price },
              { label: "Neckline 2", timestamp: p4.timestamp, price: p4.price },
              { label: "Right Shoulder", timestamp: p5.timestamp, price: p5.price, isProvisional: p5.isProvisional },
            ],
            projection,
            completenessScore: state === "CONFIRMED" ? 100 : 80,
            isDeveloping: state === "DEVELOPING",
            levels: {
              entry: necklinePrice,
              neckline: necklinePrice,
              breakoutLevel: necklinePrice,
              target1: targetPrice,
              stopLoss: p3.price,
              invalidationLevel: p3.price,
            },
            progress: {
              percentage: state === "CONFIRMED" ? 100 : 80,
              description: state === "CONFIRMED" ? "Confirmed: Bullish breakout above neckline" : "Right shoulder completed",
            },
          };
        }
      }
    }
    return null;
  }

  // =========================================================================
  // 4. DOUBLE BOTTOM
  // =========================================================================
  private checkDoubleBottom(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 2) return null;

    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    const p1 = w[0]; // Trough 1
    const p2 = w[1]; // Peak / Neckline
    if (p1.type !== "LOW" || p2.type !== "HIGH") return null;

    const troughDiff = p2.price - p1.price;
    if (troughDiff <= 0) return null;

    const p3 = w[2]?.type === "LOW" ? w[2] : null;

    const retestPrice = p3 ? p3.price : currentPrice;
    const diff = Math.abs(retestPrice - p1.price) / p1.price;
    if (diff > 0.02) return null;

    const neckline = p2.price;
    const floor = Math.min(p1.price, retestPrice);
    const target = neckline + (neckline - floor);

    let state: PatternLifecycleState = p3 ? (p3.isProvisional ? "DEVELOPING" : "COMPLETED") : "FORMING";
    if (currentPrice > neckline) state = "CONFIRMED";
    if (currentPrice < floor * 0.995) state = "INVALIDATED";

    const estBreakoutTs = latestTs + 4 * stepSec;
    const estTargetTs = estBreakoutTs + 8 * stepSec;

    const projection: FutureProjection = {
      projectedPoints: [
        { label: "Neckline Breakout", timestamp: estBreakoutTs, price: neckline, type: "BREAKOUT", isProjected: true },
        { label: "Measured Target", timestamp: estTargetTs, price: target, type: "TARGET", isProjected: true },
      ],
      projectedLines: [
        { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estBreakoutTs, price: neckline }, style: "dashed", label: "Breakout Path" },
        { from: { timestamp: p2.timestamp, price: neckline }, to: { timestamp: estBreakoutTs + 6 * stepSec, price: neckline }, style: "dotted", label: "Neckline Level" },
        { from: { timestamp: estBreakoutTs, price: neckline }, to: { timestamp: estTargetTs, price: target }, style: "dotted", label: "Target" },
      ],
      targetZone: { price: target, startTs: estBreakoutTs, endTs: estTargetTs + 4 * stepSec },
      breakoutLevel: neckline,
      invalidationLevel: floor,
      expectedBreakoutDirection: "BULLISH",
      estimatedTimeToCompletion: state === "CONFIRMED" ? "Target active" : "~4-8 bars",
      description: state === "CONFIRMED" ? "Confirmed: Double bottom neckline breakout!" : "Double bottom support retest underway. Projecting rally toward neckline.",
    };

    const keyPoints: any[] = [
      { label: "Trough 1", timestamp: p1.timestamp, price: p1.price },
      { label: "Neckline", timestamp: p2.timestamp, price: p2.price },
    ];
    if (p3) {
      keyPoints.push({ label: "Trough 2", timestamp: p3.timestamp, price: p3.price, isProvisional: p3.isProvisional });
    }

    return {
      id: `${symbol}-${timeframe}-DOUBLE_BOTTOM-${p1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "DOUBLE_BOTTOM",
      name: "Double Bottom",
      direction: "BULLISH",
      state,
      firstDetectedAt: p1.isoTime,
      lastUpdatedAt: currentCandle.isoTime,
      startTime: p1.timestamp,
      endTime: p3 ? p3.timestamp : latestTs,
      latestStructuralTimestamp: p3 ? p3.timestamp : latestTs,
      keyPoints,
      projection,
      completenessScore: state === "CONFIRMED" ? 100 : p3 ? 80 : 60,
      isDeveloping: state === "FORMING" || state === "DEVELOPING",
      levels: { entry: neckline, neckline, breakoutLevel: neckline, target1: target, stopLoss: floor, invalidationLevel: floor },
      progress: {
        percentage: state === "CONFIRMED" ? 100 : p3 ? 80 : 60,
        description: state === "CONFIRMED" ? "Confirmed: Breakout above neckline" : "Second trough retesting support level",
      },
    };
  }

  // =========================================================================
  // 5. DOUBLE TOP
  // =========================================================================
  private checkDoubleTop(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 2) return null;
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    const p1 = w[0]; // Peak 1
    const p2 = w[1]; // Trough / Neckline
    if (p1.type !== "HIGH" || p2.type !== "LOW") return null;

    const p3 = w[2]?.type === "HIGH" ? w[2] : null;
    const retestPrice = p3 ? p3.price : currentPrice;
    const diff = Math.abs(retestPrice - p1.price) / p1.price;
    if (diff > 0.02) return null;

    const neckline = p2.price;
    const ceiling = Math.max(p1.price, retestPrice);
    const target = neckline - (ceiling - neckline);

    let state: PatternLifecycleState = p3 ? (p3.isProvisional ? "DEVELOPING" : "COMPLETED") : "FORMING";
    if (currentPrice < neckline) state = "CONFIRMED";
    if (currentPrice > ceiling * 1.005) state = "INVALIDATED";

    const estBreakdownTs = latestTs + 4 * stepSec;
    const estTargetTs = estBreakdownTs + 8 * stepSec;

    const projection: FutureProjection = {
      projectedPoints: [
        { label: "Neckline Breakdown", timestamp: estBreakdownTs, price: neckline, type: "BREAKOUT", isProjected: true },
        { label: "Target", timestamp: estTargetTs, price: target, type: "TARGET", isProjected: true },
      ],
      projectedLines: [
        { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estBreakdownTs, price: neckline }, style: "dashed" },
        { from: { timestamp: estBreakdownTs, price: neckline }, to: { timestamp: estTargetTs, price: target }, style: "dotted", label: "Breakdown" },
      ],
      targetZone: { price: target, startTs: estBreakdownTs, endTs: estTargetTs + 4 * stepSec },
      breakoutLevel: neckline,
      invalidationLevel: ceiling,
      expectedBreakoutDirection: "BEARISH",
      estimatedTimeToCompletion: state === "CONFIRMED" ? "Target active" : "~4-8 bars",
      description: state === "CONFIRMED" ? "Confirmed: Double top neckline breakdown!" : "Double top resistance retest. Projecting breakdown.",
    };

    const keyPoints: any[] = [
      { label: "Peak 1", timestamp: p1.timestamp, price: p1.price },
      { label: "Neckline", timestamp: p2.timestamp, price: p2.price },
    ];
    if (p3) {
      keyPoints.push({ label: "Peak 2", timestamp: p3.timestamp, price: p3.price, isProvisional: p3.isProvisional });
    }

    return {
      id: `${symbol}-${timeframe}-DOUBLE_TOP-${p1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "DOUBLE_TOP",
      name: "Double Top",
      direction: "BEARISH",
      state,
      firstDetectedAt: p1.isoTime,
      lastUpdatedAt: currentCandle.isoTime,
      startTime: p1.timestamp,
      endTime: p3 ? p3.timestamp : latestTs,
      latestStructuralTimestamp: p3 ? p3.timestamp : latestTs,
      keyPoints,
      projection,
      completenessScore: state === "CONFIRMED" ? 100 : p3 ? 80 : 60,
      isDeveloping: state === "FORMING" || state === "DEVELOPING",
      levels: { entry: neckline, neckline, breakoutLevel: neckline, target1: target, stopLoss: ceiling, invalidationLevel: ceiling },
      progress: {
        percentage: state === "CONFIRMED" ? 100 : p3 ? 80 : 60,
        description: state === "CONFIRMED" ? "Confirmed: Breakdown below neckline" : "Second peak retesting resistance",
      },
    };
  }

  // =========================================================================
  // 5B. TRIPLE TOP & TRIPLE BOTTOM
  // =========================================================================
  private checkTripleTop(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 4) return null;
    const highs = w.filter((p) => p.type === "HIGH");
    const lows = w.filter((p) => p.type === "LOW");
    if (highs.length < 2 || lows.length < 1) return null;

    const h1 = highs[0];
    const h2 = highs[1];
    const h3 = highs[2] ?? null;
    const l1 = lows[0];
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    const diff12 = Math.abs(h1.price - h2.price) / h1.price;
    if (diff12 > 0.025) return null;

    const testPrice = h3 ? h3.price : currentPrice;
    const diff3 = Math.abs(testPrice - h1.price) / h1.price;
    if (diff3 > 0.025) return null;

    const ceiling = Math.max(h1.price, h2.price, testPrice);
    const neckline = l1.price;
    const target = neckline - (ceiling - neckline);

    let state: PatternLifecycleState = h3 ? "DEVELOPING" : "FORMING";
    if (currentPrice < neckline) state = "CONFIRMED";
    if (currentPrice > ceiling * 1.008) state = "INVALIDATED";

    const estBreakdownTs = latestTs + 4 * stepSec;
    const estTargetTs = estBreakdownTs + 8 * stepSec;

    const projection: FutureProjection = {
      projectedPoints: [
        { label: "Neckline Breakdown", timestamp: estBreakdownTs, price: neckline, type: "BREAKOUT", isProjected: true },
        { label: "Target (Depth)", timestamp: estTargetTs, price: target, type: "TARGET", isProjected: true },
      ],
      projectedLines: [
        { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estBreakdownTs, price: neckline }, style: "dashed" },
        { from: { timestamp: estBreakdownTs, price: neckline }, to: { timestamp: estTargetTs, price: target }, style: "dotted", label: "Target" },
      ],
      targetZone: { price: target, startTs: estBreakdownTs, endTs: estTargetTs + 4 * stepSec },
      breakoutLevel: neckline,
      invalidationLevel: ceiling,
      expectedBreakoutDirection: "BEARISH",
      estimatedTimeToCompletion: state === "CONFIRMED" ? "Target active" : "~4-8 bars",
      description: "Triple Top resistance retest. 3rd peak testing level; projecting breakdown.",
    };

    const keyPoints: any[] = [
      { label: "Peak 1", timestamp: h1.timestamp, price: h1.price },
      { label: "Trough 1", timestamp: l1.timestamp, price: l1.price },
      { label: "Peak 2", timestamp: h2.timestamp, price: h2.price },
    ];
    if (h3) keyPoints.push({ label: "Peak 3", timestamp: h3.timestamp, price: h3.price, isProvisional: h3.isProvisional });

    return {
      id: `${symbol}-${timeframe}-TRIPLE_TOP-${h1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "TRIPLE_TOP",
      name: "Triple Top",
      direction: "BEARISH",
      state,
      firstDetectedAt: h1.isoTime,
      lastUpdatedAt: currentCandle.isoTime,
      startTime: h1.timestamp,
      endTime: h3 ? h3.timestamp : latestTs,
      latestStructuralTimestamp: h3 ? h3.timestamp : latestTs,
      keyPoints,
      projection,
      completenessScore: state === "CONFIRMED" ? 100 : h3 ? 85 : 65,
      isDeveloping: state === "FORMING" || state === "DEVELOPING",
      levels: { entry: neckline, neckline, breakoutLevel: neckline, target1: target, stopLoss: ceiling, invalidationLevel: ceiling },
      progress: { percentage: state === "CONFIRMED" ? 100 : h3 ? 85 : 65, description: "Third peak testing major resistance ceiling" },
    };
  }

  private checkTripleBottom(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 4) return null;
    const lows = w.filter((p) => p.type === "LOW");
    const highs = w.filter((p) => p.type === "HIGH");
    if (lows.length < 2 || highs.length < 1) return null;

    const l1 = lows[0];
    const l2 = lows[1];
    const l3 = lows[2] ?? null;
    const h1 = highs[0];
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    const diff12 = Math.abs(l1.price - l2.price) / l1.price;
    if (diff12 > 0.025) return null;

    const testPrice = l3 ? l3.price : currentPrice;
    const diff3 = Math.abs(testPrice - l1.price) / l1.price;
    if (diff3 > 0.025) return null;

    const floor = Math.min(l1.price, l2.price, testPrice);
    const neckline = h1.price;
    const target = neckline + (neckline - floor);

    let state: PatternLifecycleState = l3 ? "DEVELOPING" : "FORMING";
    if (currentPrice > neckline) state = "CONFIRMED";
    if (currentPrice < floor * 0.992) state = "INVALIDATED";

    const estBreakoutTs = latestTs + 4 * stepSec;
    const estTargetTs = estBreakoutTs + 8 * stepSec;

    const projection: FutureProjection = {
      projectedPoints: [
        { label: "Neckline Breakout", timestamp: estBreakoutTs, price: neckline, type: "BREAKOUT", isProjected: true },
        { label: "Target (Depth)", timestamp: estTargetTs, price: target, type: "TARGET", isProjected: true },
      ],
      projectedLines: [
        { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estBreakoutTs, price: neckline }, style: "dashed" },
        { from: { timestamp: estBreakoutTs, price: neckline }, to: { timestamp: estTargetTs, price: target }, style: "dotted", label: "Target" },
      ],
      targetZone: { price: target, startTs: estBreakoutTs, endTs: estTargetTs + 4 * stepSec },
      breakoutLevel: neckline,
      invalidationLevel: floor,
      expectedBreakoutDirection: "BULLISH",
      estimatedTimeToCompletion: state === "CONFIRMED" ? "Target active" : "~4-8 bars",
      description: "Triple Bottom support retest. 3rd trough defending floor; projecting breakout.",
    };

    const keyPoints: any[] = [
      { label: "Trough 1", timestamp: l1.timestamp, price: l1.price },
      { label: "Peak 1", timestamp: h1.timestamp, price: h1.price },
      { label: "Trough 2", timestamp: l2.timestamp, price: l2.price },
    ];
    if (l3) keyPoints.push({ label: "Trough 3", timestamp: l3.timestamp, price: l3.price, isProvisional: l3.isProvisional });

    return {
      id: `${symbol}-${timeframe}-TRIPLE_BOTTOM-${l1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "TRIPLE_BOTTOM",
      name: "Triple Bottom",
      direction: "BULLISH",
      state,
      firstDetectedAt: l1.isoTime,
      lastUpdatedAt: currentCandle.isoTime,
      startTime: l1.timestamp,
      endTime: l3 ? l3.timestamp : latestTs,
      latestStructuralTimestamp: l3 ? l3.timestamp : latestTs,
      keyPoints,
      projection,
      completenessScore: state === "CONFIRMED" ? 100 : l3 ? 85 : 65,
      isDeveloping: state === "FORMING" || state === "DEVELOPING",
      levels: { entry: neckline, neckline, breakoutLevel: neckline, target1: target, stopLoss: floor, invalidationLevel: floor },
      progress: { percentage: state === "CONFIRMED" ? 100 : l3 ? 85 : 65, description: "Third trough defending major support floor" },
    };
  }

  // =========================================================================
  // 6. TRIANGLES (Ascending, Descending, Symmetrical)
  // =========================================================================
  private checkTrianglesAndWedges(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 4) return null;
    const highs = w.filter((p) => p.type === "HIGH");
    const lows = w.filter((p) => p.type === "LOW");
    if (highs.length < 2 || lows.length < 2) return null;

    const [h1, h2] = highs.slice(-2);
    const [l1, l2] = lows.slice(-2);
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    const highSlope = (h2.price - h1.price) / (h2.timestamp - h1.timestamp);
    const lowSlope = (l2.price - l1.price) / (l2.timestamp - l1.timestamp);

    const flatThreshold = 0.008;
    const isHighFlat = Math.abs(h2.price - h1.price) / h1.price < flatThreshold;
    const isLowFlat = Math.abs(l2.price - l1.price) / l1.price < flatThreshold;

    let patternCode = "";
    let name = "";
    let direction: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";

    if (isHighFlat && lowSlope > 0) {
      patternCode = "ASCENDING_TRIANGLE";
      name = "Ascending Triangle";
      direction = "BULLISH";
    } else if (isLowFlat && highSlope < 0) {
      patternCode = "DESCENDING_TRIANGLE";
      name = "Descending Triangle";
      direction = "BEARISH";
    } else if (highSlope < 0 && lowSlope > 0) {
      patternCode = "SYMMETRICAL_TRIANGLE";
      name = "Symmetrical Triangle";
      direction = currentPrice > (h2.price + l2.price) / 2 ? "BULLISH" : "BEARISH";
    } else {
      return null;
    }

    const isBull = direction === "BULLISH";
    const height = Math.abs(h1.price - l1.price);
    const breakoutLevel = isBull ? h2.price : l2.price;
    const targetPrice = isBull ? breakoutLevel + height : breakoutLevel - height;

    let state: PatternLifecycleState = "DEVELOPING";
    if (isBull && currentPrice > breakoutLevel) state = "CONFIRMED";
    else if (!isBull && currentPrice < breakoutLevel) state = "CONFIRMED";

    const estBreakoutTs = latestTs + 5 * stepSec;
    const estTargetTs = estBreakoutTs + 10 * stepSec;

    const futureHighPrice = h2.price + highSlope * (estBreakoutTs - h2.timestamp);
    const futureLowPrice = l2.price + lowSlope * (estBreakoutTs - l2.timestamp);

    const projection: FutureProjection = {
      projectedPoints: [
        { label: "Breakout Zone", timestamp: estBreakoutTs, price: breakoutLevel, type: "BREAKOUT", isProjected: true },
        { label: "Target (Base Height)", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true },
      ],
      projectedLines: [
        { from: { timestamp: h2.timestamp, price: h2.price }, to: { timestamp: estBreakoutTs, price: futureHighPrice }, style: "dashed", label: "Upper Boundary" },
        { from: { timestamp: l2.timestamp, price: l2.price }, to: { timestamp: estBreakoutTs, price: futureLowPrice }, style: "dashed", label: "Lower Boundary" },
        { from: { timestamp: estBreakoutTs, price: breakoutLevel }, to: { timestamp: estTargetTs, price: targetPrice }, style: "dotted", label: "Breakout Move" },
      ],
      targetZone: { price: targetPrice, startTs: estBreakoutTs, endTs: estTargetTs + 4 * stepSec },
      breakoutLevel,
      invalidationLevel: isBull ? l2.price : h2.price,
      expectedBreakoutDirection: direction,
      estimatedTimeToCompletion: state === "CONFIRMED" ? "Target active" : "~5-8 bars",
      description: `${name} converging into future space. Projecting continuation breakout.`,
    };

    return {
      id: `${symbol}-${timeframe}-${patternCode}-${h1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: patternCode,
      name,
      direction,
      state,
      firstDetectedAt: h1.isoTime,
      lastUpdatedAt: currentCandle.isoTime,
      startTime: Math.min(h1.timestamp, l1.timestamp),
      endTime: Math.max(h2.timestamp, l2.timestamp),
      latestStructuralTimestamp: Math.max(h2.timestamp, l2.timestamp),
      keyPoints: [
        { label: "High 1", timestamp: h1.timestamp, price: h1.price },
        { label: "Low 1", timestamp: l1.timestamp, price: l1.price },
        { label: "High 2", timestamp: h2.timestamp, price: h2.price },
        { label: "Low 2", timestamp: l2.timestamp, price: l2.price },
      ],
      projection,
      completenessScore: state === "CONFIRMED" ? 100 : 75,
      isDeveloping: state === "DEVELOPING",
      levels: {
        entry: breakoutLevel,
        breakoutLevel,
        target1: targetPrice,
        stopLoss: isBull ? l2.price : h2.price,
        invalidationLevel: isBull ? l2.price : h2.price,
      },
      progress: {
        percentage: state === "CONFIRMED" ? 100 : 75,
        description: state === "CONFIRMED" ? `Confirmed: Breakout from ${name}` : `Converging in ${name}`,
      },
    };
  }

  // =========================================================================
  // 6B. WEDGES (Rising Wedge & Falling Wedge)
  // =========================================================================
  private checkWedges(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 4) return null;
    const highs = w.filter((p) => p.type === "HIGH");
    const lows = w.filter((p) => p.type === "LOW");
    if (highs.length < 2 || lows.length < 2) return null;

    const [h1, h2] = highs.slice(-2);
    const [l1, l2] = lows.slice(-2);
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    const highSlope = (h2.price - h1.price) / (h2.timestamp - h1.timestamp);
    const lowSlope = (l2.price - l1.price) / (l2.timestamp - l1.timestamp);

    let patternCode = "";
    let name = "";
    let direction: "BULLISH" | "BEARISH" = "BEARISH";

    // Rising Wedge: both slopes > 0, lowSlope > highSlope (support rising steeper)
    if (highSlope > 0 && lowSlope > 0 && lowSlope > highSlope && h2.price > h1.price && l2.price > l1.price) {
      patternCode = "RISING_WEDGE";
      name = "Rising Wedge";
      direction = "BEARISH"; // Bearish reversal/continuation
    }
    // Falling Wedge: both slopes < 0, highSlope steeper downward than lowSlope
    else if (highSlope < 0 && lowSlope < 0 && highSlope < lowSlope && h2.price < h1.price && l2.price < l1.price) {
      patternCode = "FALLING_WEDGE";
      name = "Falling Wedge";
      direction = "BULLISH"; // Bullish reversal/continuation
    } else {
      return null;
    }

    const isBull = direction === "BULLISH";
    const height = Math.abs(h1.price - l1.price);
    const breakoutLevel = isBull ? h2.price : l2.price;
    const targetPrice = isBull ? breakoutLevel + height : breakoutLevel - height;

    let state: PatternLifecycleState = "DEVELOPING";
    if (isBull && currentPrice > breakoutLevel) state = "CONFIRMED";
    else if (!isBull && currentPrice < breakoutLevel) state = "CONFIRMED";

    const estBreakoutTs = latestTs + 4 * stepSec;
    const estTargetTs = estBreakoutTs + 8 * stepSec;

    const projection: FutureProjection = {
      projectedPoints: [
        { label: "Wedge Breakout", timestamp: estBreakoutTs, price: breakoutLevel, type: "BREAKOUT", isProjected: true },
        { label: "Target", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true },
      ],
      projectedLines: [
        { from: { timestamp: h2.timestamp, price: h2.price }, to: { timestamp: estBreakoutTs, price: h2.price + highSlope * 4 * stepSec }, style: "dashed", label: "Upper Boundary" },
        { from: { timestamp: l2.timestamp, price: l2.price }, to: { timestamp: estBreakoutTs, price: l2.price + lowSlope * 4 * stepSec }, style: "dashed", label: "Lower Boundary" },
      ],
      targetZone: { price: targetPrice, startTs: estBreakoutTs, endTs: estTargetTs + 4 * stepSec },
      breakoutLevel,
      invalidationLevel: isBull ? l2.price : h2.price,
      expectedBreakoutDirection: direction,
      estimatedTimeToCompletion: state === "CONFIRMED" ? "Target active" : "~4-7 bars",
      description: `${name} converging in same directional slope. Projecting ${direction} breakout.`,
    };

    return {
      id: `${symbol}-${timeframe}-${patternCode}-${h1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: patternCode,
      name,
      direction,
      state,
      firstDetectedAt: h1.isoTime,
      lastUpdatedAt: currentCandle.isoTime,
      startTime: Math.min(h1.timestamp, l1.timestamp),
      endTime: Math.max(h2.timestamp, l2.timestamp),
      latestStructuralTimestamp: Math.max(h2.timestamp, l2.timestamp),
      keyPoints: [
        { label: "High 1", timestamp: h1.timestamp, price: h1.price },
        { label: "Low 1", timestamp: l1.timestamp, price: l1.price },
        { label: "High 2", timestamp: h2.timestamp, price: h2.price },
        { label: "Low 2", timestamp: l2.timestamp, price: l2.price },
      ],
      projection,
      completenessScore: state === "CONFIRMED" ? 100 : 75,
      isDeveloping: state === "DEVELOPING",
      levels: { entry: breakoutLevel, breakoutLevel, target1: targetPrice, stopLoss: isBull ? l2.price : h2.price },
      progress: { percentage: state === "CONFIRMED" ? 100 : 75, description: `Converging boundaries inside ${name}` },
    };
  }

  // =========================================================================
  // 6C. BROADENING FORMATIONS (Megaphone)
  // =========================================================================
  private checkBroadeningFormations(
    w: SwingPoint[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern | null {
    if (w.length < 4) return null;
    const highs = w.filter((p) => p.type === "HIGH");
    const lows = w.filter((p) => p.type === "LOW");
    if (highs.length < 2 || lows.length < 2) return null;

    const [h1, h2] = highs.slice(-2);
    const [l1, l2] = lows.slice(-2);
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    // Megaphone / Broadening: Higher highs (h2 > h1) AND Lower lows (l2 < l1)
    if (h2.price > h1.price * 1.002 && l2.price < l1.price * 0.998) {
      const direction: "BULLISH" | "BEARISH" = currentPrice > (h2.price + l2.price) / 2 ? "BULLISH" : "BEARISH";
      const breakoutLevel = direction === "BULLISH" ? h2.price : l2.price;
      const height = h2.price - l2.price;
      const targetPrice = direction === "BULLISH" ? breakoutLevel + 0.618 * height : breakoutLevel - 0.618 * height;

      const state: PatternLifecycleState = direction === "BULLISH"
        ? currentPrice > breakoutLevel ? "CONFIRMED" : "DEVELOPING"
        : currentPrice < breakoutLevel ? "CONFIRMED" : "DEVELOPING";

      const estBreakoutTs = latestTs + 4 * stepSec;

      const projection: FutureProjection = {
        projectedPoints: [
          { label: "Boundary Breakout", timestamp: estBreakoutTs, price: breakoutLevel, type: "BREAKOUT", isProjected: true },
          { label: "Target", timestamp: estBreakoutTs + 6 * stepSec, price: targetPrice, type: "TARGET", isProjected: true },
        ],
        projectedLines: [
          { from: { timestamp: h1.timestamp, price: h1.price }, to: { timestamp: estBreakoutTs, price: h2.price * 1.01 }, style: "dashed", label: "Upper Megaphone" },
          { from: { timestamp: l1.timestamp, price: l1.price }, to: { timestamp: estBreakoutTs, price: l2.price * 0.99 }, style: "dashed", label: "Lower Megaphone" },
        ],
        breakoutLevel,
        invalidationLevel: direction === "BULLISH" ? l2.price : h2.price,
        expectedBreakoutDirection: direction,
        description: "Broadening formation (Megaphone) expanding outward with higher highs and lower lows.",
      };

      return {
        id: `${symbol}-${timeframe}-BROADENING-${h1.timestamp}`,
        instrument: symbol,
        timeframe,
        family: "CLASSICAL_CHART",
        pattern: "BROADENING_FORMATION",
        name: "Broadening Formation (Megaphone)",
        direction,
        state,
        firstDetectedAt: h1.isoTime,
        lastUpdatedAt: currentCandle.isoTime,
        startTime: Math.min(h1.timestamp, l1.timestamp),
        endTime: Math.max(h2.timestamp, l2.timestamp),
        latestStructuralTimestamp: Math.max(h2.timestamp, l2.timestamp),
        keyPoints: [
          { label: "High 1", timestamp: h1.timestamp, price: h1.price },
          { label: "Low 1", timestamp: l1.timestamp, price: l1.price },
          { label: "High 2", timestamp: h2.timestamp, price: h2.price },
          { label: "Low 2", timestamp: l2.timestamp, price: l2.price },
        ],
        projection,
        completenessScore: state === "CONFIRMED" ? 100 : 70,
        isDeveloping: state === "DEVELOPING",
        levels: { entry: breakoutLevel, breakoutLevel, target1: targetPrice },
        progress: { percentage: state === "CONFIRMED" ? 100 : 70, description: "Volatility expanding between diverging boundaries" },
      };
    }

    return null;
  }

  // =========================================================================
  // 7. FLAGS & PENNANTS
  // =========================================================================
  private checkFlagAndPennants(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    currentPrice: number,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern[] {
    const list: DetectedPattern[] = [];
    if (candles.length < 20) return list;

    const poleLength = 8;
    const flagLength = 8;
    const startIdx = candles.length - (poleLength + flagLength);
    if (startIdx < 0) return list;

    const poleStart = candles[startIdx];
    const poleEnd = candles[startIdx + poleLength];
    const flagEnd = candles[candles.length - 1];

    const poleHeight = poleEnd.close - poleStart.open;
    const polePct = Math.abs(poleHeight) / poleStart.open;

    if (polePct >= 0.006) {
      const isBull = poleHeight > 0;
      const consolidationDiff = isBull ? poleEnd.high - flagEnd.low : flagEnd.high - poleEnd.low;

      if (consolidationDiff <= 0.5 * Math.abs(poleHeight)) {
        // Distinguish Flag vs Pennant: Pennant has converging highs/lows inside consolidation
        const consolCandles = candles.slice(startIdx + poleLength);
        const consolHigh1 = Math.max(...consolCandles.slice(0, 4).map((c) => c.high));
        const consolHigh2 = Math.max(...consolCandles.slice(4).map((c) => c.high));
        const consolLow1 = Math.min(...consolCandles.slice(0, 4).map((c) => c.low));
        const consolLow2 = Math.min(...consolCandles.slice(4).map((c) => c.low));

        const isPennant = consolHigh2 < consolHigh1 && consolLow2 > consolLow1;

        const patternCode = isPennant
          ? isBull ? "BULLISH_PENNANT" : "BEARISH_PENNANT"
          : isBull ? "BULLISH_FLAG" : "BEARISH_FLAG";

        const name = isPennant
          ? isBull ? "Bullish Pennant" : "Bearish Pennant"
          : isBull ? "Bullish Flag" : "Bearish Flag";

        const breakoutLevel = isBull ? poleEnd.high : poleEnd.low;
        const targetPrice = isBull ? breakoutLevel + Math.abs(poleHeight) : breakoutLevel - Math.abs(poleHeight);

        const state: PatternLifecycleState = isBull
          ? currentPrice > breakoutLevel ? "CONFIRMED" : "DEVELOPING"
          : currentPrice < breakoutLevel ? "CONFIRMED" : "DEVELOPING";

        const estBreakoutTs = flagEnd.timestamp + 3 * stepSec;
        const estTargetTs = estBreakoutTs + 8 * stepSec;

        const projection: FutureProjection = {
          projectedPoints: [
            { label: "Continuation Breakout", timestamp: estBreakoutTs, price: breakoutLevel, type: "BREAKOUT", isProjected: true },
            { label: "Measured Pole Target", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true },
          ],
          projectedLines: [
            { from: { timestamp: flagEnd.timestamp, price: currentPrice }, to: { timestamp: estBreakoutTs, price: breakoutLevel }, style: "dashed" },
            { from: { timestamp: estBreakoutTs, price: breakoutLevel }, to: { timestamp: estTargetTs, price: targetPrice }, style: "dotted", label: "Pole Run" },
          ],
          targetZone: { price: targetPrice, startTs: estBreakoutTs, endTs: estTargetTs + 4 * stepSec },
          breakoutLevel,
          invalidationLevel: isBull ? flagEnd.low : flagEnd.high,
          expectedBreakoutDirection: isBull ? "BULLISH" : "BEARISH",
          estimatedTimeToCompletion: state === "CONFIRMED" ? "Target active" : "~3-5 bars",
          description: `${name} consolidation following impulse flagpole. Projecting continuation move.`,
        };

        list.push({
          id: `${symbol}-${timeframe}-${patternCode}-${poleStart.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "CLASSICAL_CHART",
          pattern: patternCode,
          name,
          direction: isBull ? "BULLISH" : "BEARISH",
          state,
          firstDetectedAt: poleStart.isoTime,
          lastUpdatedAt: flagEnd.isoTime,
          startTime: poleStart.timestamp,
          endTime: flagEnd.timestamp,
          latestStructuralTimestamp: flagEnd.timestamp,
          keyPoints: [
            { label: "Flagpole Base", timestamp: poleStart.timestamp, price: poleStart.open },
            { label: "Flagpole Top", timestamp: poleEnd.timestamp, price: poleEnd.high },
            { label: "Consolidation End", timestamp: flagEnd.timestamp, price: flagEnd.close },
          ],
          projection,
          completenessScore: state === "CONFIRMED" ? 100 : 70,
          isDeveloping: state === "DEVELOPING",
          levels: {
            entry: breakoutLevel,
            breakoutLevel,
            target1: targetPrice,
            stopLoss: isBull ? flagEnd.low : flagEnd.high,
            invalidationLevel: isBull ? flagEnd.low : flagEnd.high,
          },
          progress: {
            percentage: state === "CONFIRMED" ? 100 : 70,
            description: state === "CONFIRMED" ? `Confirmed: Breakout from ${name}` : `${name} forming after impulse pole`,
          },
        });
      }
    }

    return list;
  }

  // =========================================================================
  // 8. ROUNDING TOP & ROUNDING BOTTOM (Saucer & Dome)
  // =========================================================================
  private checkRoundingTopAndBottom(
    candles: readonly OHLCV[],
    currentCandle: OHLCV,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern[] {
    const list: DetectedPattern[] = [];
    if (candles.length < 25) return list;

    const windowBars = 20;
    const cSlice = candles.slice(-windowBars);
    const startBar = cSlice[0];
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    // Check Rounding Bottom (Saucer)
    // Start price near rim, lowest point in middle, current price curving back up
    const midIdx = Math.floor(windowBars / 2);
    const minLow = Math.min(...cSlice.map((c) => c.low));
    const minLowIdx = cSlice.findIndex((c) => c.low === minLow);

    if (minLowIdx >= 4 && minLowIdx <= windowBars - 4) {
      const rimPrice = startBar.high;
      const bowlDepth = rimPrice - minLow;

      if (bowlDepth / startBar.open >= 0.006) {
        const recovery = currentPrice - minLow;
        if (recovery >= 0.4 * bowlDepth) {
          const isConfirmed = currentPrice > rimPrice;
          const targetPrice = rimPrice + bowlDepth;
          const completeness = isConfirmed ? 100 : Math.min(85, Math.round(50 + (recovery / bowlDepth) * 35));

          const projection: FutureProjection = {
            projectedPoints: [
              { label: "Rim Breakout", timestamp: latestTs + 4 * stepSec, price: rimPrice, type: "BREAKOUT", isProjected: true },
              { label: "Target (+Bowl Depth)", timestamp: latestTs + 10 * stepSec, price: targetPrice, type: "TARGET", isProjected: true },
            ],
            projectedLines: [
              { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: latestTs + 4 * stepSec, price: rimPrice }, style: "dashed" },
              { from: { timestamp: latestTs + 4 * stepSec, price: rimPrice }, to: { timestamp: latestTs + 10 * stepSec, price: targetPrice }, style: "dotted", label: "Target" },
            ],
            breakoutLevel: rimPrice,
            invalidationLevel: minLow,
            expectedBreakoutDirection: "BULLISH",
            description: "Rounding Bottom (Saucer) curving back up towards rim resistance.",
          };

          list.push({
            id: `${symbol}-${timeframe}-ROUNDING_BOTTOM-${startBar.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "CLASSICAL_CHART",
            pattern: "ROUNDING_BOTTOM",
            name: "Rounding Bottom (Saucer)",
            direction: "BULLISH",
            state: isConfirmed ? "CONFIRMED" : "DEVELOPING",
            firstDetectedAt: startBar.isoTime,
            lastUpdatedAt: currentCandle.isoTime,
            startTime: startBar.timestamp,
            endTime: latestTs,
            latestStructuralTimestamp: latestTs,
            keyPoints: [
              { label: "Rim Left", timestamp: startBar.timestamp, price: startBar.high },
              { label: "Saucer Low", timestamp: cSlice[minLowIdx].timestamp, price: minLow },
            ],
            projection,
            completenessScore: completeness,
            isDeveloping: !isConfirmed,
            levels: { entry: rimPrice, breakoutLevel: rimPrice, target1: targetPrice, stopLoss: minLow },
            progress: { percentage: completeness, description: "Rounding saucer curving back up toward rim" },
          });
        }
      }
    }

    // Check Rounding Top (Dome)
    const maxHigh = Math.max(...cSlice.map((c) => c.high));
    const maxHighIdx = cSlice.findIndex((c) => c.high === maxHigh);

    if (maxHighIdx >= 4 && maxHighIdx <= windowBars - 4) {
      const floorPrice = startBar.low;
      const domeHeight = maxHigh - floorPrice;

      if (domeHeight / startBar.open >= 0.006) {
        const decline = maxHigh - currentPrice;
        if (decline >= 0.4 * domeHeight) {
          const isConfirmed = currentPrice < floorPrice;
          const targetPrice = floorPrice - domeHeight;
          const completeness = isConfirmed ? 100 : Math.min(85, Math.round(50 + (decline / domeHeight) * 35));

          const projection: FutureProjection = {
            projectedPoints: [
              { label: "Floor Breakdown", timestamp: latestTs + 4 * stepSec, price: floorPrice, type: "BREAKOUT", isProjected: true },
              { label: "Target (-Dome Height)", timestamp: latestTs + 10 * stepSec, price: targetPrice, type: "TARGET", isProjected: true },
            ],
            projectedLines: [
              { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: latestTs + 4 * stepSec, price: floorPrice }, style: "dashed" },
              { from: { timestamp: latestTs + 4 * stepSec, price: floorPrice }, to: { timestamp: latestTs + 10 * stepSec, price: targetPrice }, style: "dotted", label: "Target" },
            ],
            breakoutLevel: floorPrice,
            invalidationLevel: maxHigh,
            expectedBreakoutDirection: "BEARISH",
            description: "Rounding Top (Dome) curving back down towards floor support.",
          };

          list.push({
            id: `${symbol}-${timeframe}-ROUNDING_TOP-${startBar.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "CLASSICAL_CHART",
            pattern: "ROUNDING_TOP",
            name: "Rounding Top (Dome)",
            direction: "BEARISH",
            state: isConfirmed ? "CONFIRMED" : "DEVELOPING",
            firstDetectedAt: startBar.isoTime,
            lastUpdatedAt: currentCandle.isoTime,
            startTime: startBar.timestamp,
            endTime: latestTs,
            latestStructuralTimestamp: latestTs,
            keyPoints: [
              { label: "Floor Left", timestamp: startBar.timestamp, price: startBar.low },
              { label: "Dome High", timestamp: cSlice[maxHighIdx].timestamp, price: maxHigh },
            ],
            projection,
            completenessScore: completeness,
            isDeveloping: !isConfirmed,
            levels: { entry: floorPrice, breakoutLevel: floorPrice, target1: targetPrice, stopLoss: maxHigh },
            progress: { percentage: completeness, description: "Rounding dome curving back down toward floor" },
          });
        }
      }
    }

    return list;
  }
}
