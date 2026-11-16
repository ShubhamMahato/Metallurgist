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

    // 1. Cup and Handle (Forward-looking: Forming -> Developing -> Confirmed -> Invalidated)
    const cupPatterns = this.checkCupAndHandle(candles, swings, currentPrice, currentHigh, currentLow, symbol, timeframe, stepSec);
    patterns.push(...cupPatterns);

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

    // 4. Triangles & Wedges (Trendline Projections)
    if (swings.length >= 4) {
      const minTriStart = activeOnly ? Math.max(0, swings.length - 5) : 0;
      for (let i = minTriStart; i <= swings.length - 4; i++) {
        const window = swings.slice(i, i + 6);
        const tri = this.checkTrianglesAndWedges(window, currentCandle, symbol, timeframe, stepSec);
        if (tri) patterns.push(tri);
      }
    }

    // 5. Flags & Pennants (Impulse + Consolidation + Continuation Projection)
    const flags = this.checkFlagAndPennants(candles, swings, currentPrice, symbol, timeframe, stepSec);
    patterns.push(...flags);

    return patterns;
  }

  // =========================================================================
  // 1. CUP AND HANDLE (Comprehensive Lifecycle & Forward Projections)
  // =========================================================================
  private checkCupAndHandle(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    currentPrice: number,
    currentHigh: number,
    currentLow: number,
    symbol: string,
    timeframe: SupportedTimeframe,
    stepSec: number
  ): DetectedPattern[] {
    const list: DetectedPattern[] = [];
    if (swings.length < 2) return list;

    const latestCandle = candles[candles.length - 1];
    const latestTs = latestCandle.timestamp;

    // Scan each candidate Left Rim swing
    for (let i = 0; i < swings.length - 1; i++) {
      const s1 = swings[i]; // Left Rim (HIGH)
      if (s1.type !== "HIGH") continue;

      // Look for confirmed Right Rim s3 (HIGH after s1 with price near s1)
      const candidateRims = swings.slice(i + 1).filter(
        (s) =>
          s.type === "HIGH" &&
          !s.isProvisional &&
          Math.abs(s1.price - s.price) / s1.price <= 0.035
      );
      const s3 = candidateRims.length > 0 ? candidateRims[0] : undefined;

      // Cup Bottom s2 is the lowest LOW between s1 and (s3 or end)
      const searchEndTs = s3 ? s3.timestamp : Infinity;
      const intermediateLows = swings.filter(
        (s) => s.type === "LOW" && s.timestamp > s1.timestamp && s.timestamp < searchEndTs
      );
      if (intermediateLows.length === 0) continue;

      // The deepest trough is the true cup bottom
      let s2 = intermediateLows[0];
      for (const low of intermediateLows) {
        if (low.price < s2.price) s2 = low;
      }

      const cupDepth = s1.price - s2.price;
      if (cupDepth <= 0 || cupDepth / s1.price < 0.004) continue;

      // If s3 was found, verify it recovered at least 80% of cupDepth from s2
      if (s3 && s3.price - s2.price < 0.8 * cupDepth) continue;

      // Check if handle trough (s4) has registered after s3
      const s4 = s3
        ? swings.find((s) => s.type === "LOW" && !s.isProvisional && s.timestamp > s3.timestamp)
        : undefined;

        // ---------------------------------------------------------------
        // STAGE 1: FORMING (Left Rim and Rounded Bottom formed; price rising back toward Left Rim)
        // ---------------------------------------------------------------
        if (!s3) {
          // Has price started recovering out of the bottom? (e.g. >= 30% recovery of cup depth)
          const recovery = currentPrice - s2.price;
          if (recovery >= 0.3 * cupDepth && currentLow >= s2.price * 0.998) {
            // Price is currently climbing to complete the cup right rim
            const completeness = Math.min(65, Math.round(30 + (recovery / cupDepth) * 35));

            // Forward projections into future space
            const estRightRimTs = latestTs + 4 * stepSec;
            const estHandleTs = latestTs + 8 * stepSec;
            const estBreakoutTs = latestTs + 12 * stepSec;
            const estTargetTs = latestTs + 18 * stepSec;

            const handleSupportMin = s1.price - 0.5 * cupDepth;
            const handleSupportMax = s1.price - 0.382 * cupDepth;
            const targetPrice = s1.price + cupDepth;

            const projectedPoints: ProjectedPoint[] = [
              { label: "Est. Right Rim", timestamp: estRightRimTs, price: s1.price, type: "ESTIMATED_POINT", isProjected: true },
              { label: "Est. Handle Low", timestamp: estHandleTs, price: (handleSupportMin + handleSupportMax) / 2, type: "COMPLETION_ZONE", isProjected: true },
              { label: "Breakout Level", timestamp: estBreakoutTs, price: s1.price, type: "BREAKOUT", isProjected: true },
              { label: "Measured Target", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true },
            ];

            const projectedLines: ProjectedLine[] = [
              { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estRightRimTs, price: s1.price }, style: "dashed", label: "Cup Completion" },
              { from: { timestamp: estRightRimTs, price: s1.price }, to: { timestamp: estHandleTs, price: (handleSupportMin + handleSupportMax) / 2 }, style: "dashed", label: "Handle Pullback" },
              { from: { timestamp: estHandleTs, price: (handleSupportMin + handleSupportMax) / 2 }, to: { timestamp: estBreakoutTs, price: s1.price }, style: "dashed", label: "Breakout" },
              { from: { timestamp: estBreakoutTs, price: s1.price }, to: { timestamp: estTargetTs, price: targetPrice }, style: "dotted", label: "Target Projection" },
            ];

            const projection: FutureProjection = {
              projectedPoints,
              projectedLines,
              completionZone: {
                min: handleSupportMin,
                max: handleSupportMax,
                startTs: estRightRimTs,
                endTs: estBreakoutTs,
                label: "Handle Pullback Zone (38.2% - 50%)",
              },
              targetZone: { price: targetPrice, startTs: estBreakoutTs, endTs: estTargetTs + 4 * stepSec, label: `Measured Move: +$${cupDepth.toFixed(1)}` },
              breakoutLevel: s1.price,
              invalidationLevel: s2.price,
              expectedBreakoutDirection: "BULLISH",
              estimatedTimeToCompletion: "~8-12 bars",
              description: "Forming rounded cup bottom. Expecting right rim retest followed by handle consolidation.",
            };

            list.push({
              id: `${symbol}-${timeframe}-CUP_AND_HANDLE-${s1.timestamp}`,
              instrument: symbol,
              timeframe,
              family: "CLASSICAL_CHART",
              pattern: "CUP_AND_HANDLE",
              name: "Cup and Handle",
              direction: "BULLISH",
              state: "FORMING",
              firstDetectedAt: s1.isoTime,
              lastUpdatedAt: latestCandle.isoTime,
              startTime: s1.timestamp,
              endTime: latestTs,
              keyPoints: [
                { label: "Left Rim", timestamp: s1.timestamp, price: s1.price },
                { label: "Cup Bottom", timestamp: s2.timestamp, price: s2.price },
              ],
              projection,
              completenessScore: completeness,
              isDeveloping: true,
              levels: {
                entry: s1.price,
                neckline: s1.price,
                breakoutLevel: s1.price,
                invalidationLevel: s2.price,
                target1: targetPrice,
                stopLoss: s2.price,
              },
              progress: {
                percentage: completeness,
                description: `Cup rounding up (${Math.round((recovery / cupDepth) * 100)}% of rim recovery)`,
              },
              confirmationCondition: {
                description: `Breakout and close above Left Rim resistance at $${s1.price.toFixed(2)}`,
                priceLevel: s1.price,
                operator: ">",
                isMet: currentPrice > s1.price,
              },
              invalidationCondition: {
                description: `Price breaks below cup bottom floor at $${s2.price.toFixed(2)}`,
                priceLevel: s2.price,
                operator: "<",
                isMet: currentLow < s2.price,
              },
            });
          }
          continue;
        }

        // ---------------------------------------------------------------
        // STAGE 2: DEVELOPING, CONFIRMED, or INVALIDATED
        // (Right Rim s3 has formed)
        // ---------------------------------------------------------------
        const rimDiff = Math.abs(s1.price - s3.price) / s1.price;
        if (rimDiff <= 0.035) {
          const rimPrice = Math.max(s1.price, s3.price);
          const handleLowPrice = Math.min(s4 ? s4.price : currentLow, currentLow);
          const handleDepth = rimPrice - handleLowPrice;

          // Invalidation: handle drops > 55% of cup depth or below bottom
          const isInvalid = currentLow < s2.price || handleLowPrice < s2.price || handleDepth > 0.55 * cupDepth;
          // Confirmation: breakout above rim
          const isConfirmed = currentPrice > rimPrice && !isInvalid;

          const state: PatternLifecycleState = isInvalid
            ? "INVALIDATED"
            : isConfirmed
            ? "CONFIRMED"
            : "DEVELOPING";

          const completeness = isConfirmed ? 100 : isInvalid ? 0 : s4 ? 85 : 75;

          const estBreakoutTs = s4 ? latestTs + 4 * stepSec : latestTs + 6 * stepSec;
          const estTargetTs = estBreakoutTs + 8 * stepSec;
          const targetPrice = rimPrice + cupDepth;

          const projectedPoints: ProjectedPoint[] = [];
          const projectedLines: ProjectedLine[] = [];

          if (state !== "INVALIDATED") {
            projectedPoints.push(
              { label: "Breakout", timestamp: estBreakoutTs, price: rimPrice, type: "BREAKOUT", isProjected: true },
              { label: "Target 1", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true }
            );

            projectedLines.push(
              { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estBreakoutTs, price: rimPrice }, style: "dashed", label: "Breakout Path" },
              { from: { timestamp: estBreakoutTs, price: rimPrice }, to: { timestamp: estTargetTs, price: targetPrice }, style: "dotted", label: "Target Path" }
            );
          }

          const projection: FutureProjection = {
            projectedPoints,
            projectedLines,
            completionZone: {
              min: rimPrice - 0.5 * cupDepth,
              max: rimPrice - 0.25 * cupDepth,
              startTs: s3.timestamp,
              endTs: estBreakoutTs,
              label: "Handle Consolidation Zone",
            },
            targetZone: { price: targetPrice, startTs: estBreakoutTs, endTs: estTargetTs + 4 * stepSec, label: `Target: +$${cupDepth.toFixed(1)}` },
            breakoutLevel: rimPrice,
            invalidationLevel: rimPrice - 0.55 * cupDepth,
            expectedBreakoutDirection: "BULLISH",
            estimatedTimeToCompletion: state === "CONFIRMED" ? "Target in progress" : "~4-6 bars",
            description:
              state === "CONFIRMED"
                ? "Confirmed breakout above cup rim! Target projection active."
                : state === "INVALIDATED"
                ? "Pattern invalidated: Handle retraced too deeply or violated cup floor."
                : "Handle consolidation underway. Awaiting volume-backed breakout above rim.",
          };

          const keyPoints: any[] = [
            { label: "Left Rim", timestamp: s1.timestamp, price: s1.price },
            { label: "Cup Bottom", timestamp: s2.timestamp, price: s2.price },
            { label: "Right Rim", timestamp: s3.timestamp, price: s3.price },
          ];
          if (s4) {
            keyPoints.push({ label: "Handle Trough", timestamp: s4.timestamp, price: s4.price, isProvisional: s4.isProvisional });
          }

          list.push({
            id: `${symbol}-${timeframe}-CUP_AND_HANDLE-${s1.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "CLASSICAL_CHART",
            pattern: "CUP_AND_HANDLE",
            name: "Cup and Handle",
            direction: "BULLISH",
            state,
            firstDetectedAt: s1.isoTime,
            lastUpdatedAt: latestCandle.isoTime,
            startTime: s1.timestamp,
            endTime: s4 ? s4.timestamp : s3.timestamp,
            keyPoints,
            projection,
            completenessScore: completeness,
            isDeveloping: state === "DEVELOPING" || state === "FORMING",
            levels: {
              entry: rimPrice,
              neckline: rimPrice,
              breakoutLevel: rimPrice,
              invalidationLevel: rimPrice - 0.55 * cupDepth,
              target1: targetPrice,
              stopLoss: handleLowPrice,
            },
            progress: {
              percentage: completeness,
              description:
                state === "CONFIRMED"
                  ? "Confirmed: Bullish breakout above rim resistance"
                  : state === "INVALIDATED"
                  ? "Invalidated: Handle retracement violated structure"
                  : "Right rim formed; handle consolidation developing",
            },
            confirmationCondition: {
              description: `Breakout and close above rim resistance at $${rimPrice.toFixed(2)}`,
              priceLevel: rimPrice,
              operator: ">",
              isMet: currentPrice > rimPrice,
            },
            invalidationCondition: {
              description: `Handle drops below invalidation level $${(rimPrice - 0.55 * cupDepth).toFixed(2)}`,
              priceLevel: rimPrice - 0.55 * cupDepth,
              operator: "<",
              isMet: isInvalid,
            },
          });
        }
      }

    return list;
  }

  // =========================================================================
  // 2. HEAD AND SHOULDERS (Forward Projection of Right Shoulder & Breakdown)
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

    // A. 5-point H&S (Left Shoulder, Neckline 1, Head, Neckline 2, Right Shoulder)
    if (w.length >= 5) {
      const [p1, p2, p3, p4, p5] = w;
      if (p1.type === "HIGH" && p2.type === "LOW" && p3.type === "HIGH" && p4.type === "LOW" && p5.type === "HIGH") {
        if (p3.price > p1.price && p3.price > p5.price) {
          const shoulderDiff = Math.abs(p1.price - p5.price) / p1.price;
          if (shoulderDiff <= 0.06) {
            const necklinePrice = (p2.price + p4.price) / 2;
            const patternHeight = p3.price - necklinePrice;
            const targetPrice = necklinePrice - patternHeight;

            let state: PatternLifecycleState = "DEVELOPING";
            if (currentPrice < necklinePrice) state = "CONFIRMED";
            if (currentHigh > p3.price) state = "INVALIDATED";

            const estBreakdownTs = latestTs + 4 * stepSec;
            const estTargetTs = estBreakdownTs + 8 * stepSec;

            const projection: FutureProjection = {
              projectedPoints: [
                { label: "Neckline Breakdown", timestamp: estBreakdownTs, price: necklinePrice, type: "BREAKOUT", isProjected: true },
                { label: "Target (H-Depth)", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true },
              ],
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
                description: state === "CONFIRMED" ? "Confirmed: Neckline breakdown" : "Right shoulder formed, awaiting breakdown",
              },
            };
          }
        }
      }
    }

    // B. FORMING (4 swings: p1=Left Shoulder, p2=Neckline, p3=Head, p4=Neckline Trough; right shoulder currently developing)
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
    if (w.length < 4) return null;
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
  // 4. DOUBLE BOTTOM (Retest Formation -> Developing Rebound -> Confirmed Breakout)
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

    // We look for: Trough 1 (LOW), Peak (HIGH), and either Trough 2 (LOW) or price currently retesting Trough 1
    const p1 = w[0]; // Trough 1
    const p2 = w[1]; // Peak / Neckline
    if (p1.type !== "LOW" || p2.type !== "HIGH") return null;

    const troughDiff = p2.price - p1.price;
    if (troughDiff <= 0) return null;

    const p3 = w[2]?.type === "LOW" ? w[2] : null;

    // Case A: Trough 2 formed or current price retesting Trough 1 (within 1.8% of Trough 1)
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
  // 6. TRIANGLES & WEDGES (Projected Converging Trendlines into Future Space)
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

    // Future trendline extensions
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
        const patternCode = isBull ? "BULLISH_FLAG" : "BEARISH_FLAG";
        const name = isBull ? "Bullish Flag" : "Bearish Flag";
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
          description: "Flag consolidation following impulse flagpole. Projecting continuation move.",
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
            description: state === "CONFIRMED" ? "Confirmed: Breakout from consolidation" : "Flag consolidation forming after impulse",
          },
        });
      }
    }

    return list;
  }
}
