import { OHLCV, SupportedTimeframe, TIMEFRAMES } from "../../types/candle";
import { SwingPoint } from "../../core/swingDetector";
import {
  DetectedPattern,
  FutureProjection,
  PatternLifecycleState,
  ProjectedPoint,
  ProjectedLine,
} from "../../types/pattern";
import { calculateProjection, calculateRetracement, isWithinRatio } from "../../core/fibonacci";

interface HarmonicRule {
  name: string;
  code: string;
  bMin: number;
  bMax: number;
  cMin: number;
  cMax: number;
  dTarget: number; // relative to XA or base
  dIsExtension: boolean;
}

const HARMONIC_RULES: HarmonicRule[] = [
  { name: "Gartley", code: "GARTLEY", bMin: 0.58, bMax: 0.65, cMin: 0.382, cMax: 0.886, dTarget: 0.786, dIsExtension: false },
  { name: "Bat", code: "BAT", bMin: 0.35, bMax: 0.53, cMin: 0.382, cMax: 0.886, dTarget: 0.886, dIsExtension: false },
  { name: "Butterfly", code: "BUTTERFLY", bMin: 0.75, bMax: 0.82, cMin: 0.382, cMax: 0.886, dTarget: 1.272, dIsExtension: true },
  { name: "Crab", code: "CRAB", bMin: 0.35, bMax: 0.65, cMin: 0.382, cMax: 0.886, dTarget: 1.618, dIsExtension: true },
  { name: "Deep Crab", code: "DEEP_CRAB", bMin: 0.85, bMax: 0.92, cMin: 0.382, cMax: 0.886, dTarget: 1.618, dIsExtension: true },
  { name: "Cypher", code: "CYPHER", bMin: 0.382, bMax: 0.618, cMin: 1.13, cMax: 1.45, dTarget: 0.786, dIsExtension: false },
  { name: "Shark", code: "SHARK", bMin: 1.13, bMax: 1.618, cMin: 1.618, cMax: 2.24, dTarget: 0.886, dIsExtension: false },
];

export class HarmonicPatternDetector {
  public detect(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    timeframe: SupportedTimeframe,
    symbol: string = "XAUUSD",
    activeOnly: boolean = true
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    if (swings.length < 4 || candles.length < 5) return patterns;

    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;
    const latestTs = currentCandle.timestamp;

    const tfDef = TIMEFRAMES.find((t) => t.id === timeframe);
    const stepSec = (tfDef ? tfDef.minutes : 5) * 60;

    // 1. Five-point XABCD Harmonics (Formed D point)
    const minHarmonicStart = activeOnly ? Math.max(0, swings.length - 5) : 0;
    for (let i = minHarmonicStart; i <= swings.length - 5; i++) {
      const window = swings.slice(i, i + 5);
      const [pX, pA, pB, pC, pD] = window;

      if (pX.type === pA.type || pA.type === pB.type || pB.type === pC.type || pC.type === pD.type) {
        continue;
      }

      const isBullish = pX.type === "LOW" && pD.type === "LOW";
      const isBearish = pX.type === "HIGH" && pD.type === "HIGH";
      if (!isBullish && !isBearish) continue;

      const legXA = Math.abs(pA.price - pX.price);
      if (legXA === 0) continue;

      const ratioB = calculateRetracement(pX.price, pA.price, pB.price);
      const ratioC = calculateRetracement(pA.price, pB.price, pC.price);
      const ratioD = calculateProjection(pX.price, pA.price, pA.price, pD.price);

      for (const rule of HARMONIC_RULES) {
        if (ratioB >= rule.bMin && ratioB <= rule.bMax && ratioC >= rule.cMin && ratioC <= rule.cMax) {
          const dMatch = isWithinRatio(ratioD, rule.dTarget, 0.12);
          if (dMatch) {
            const direction = isBullish ? "BULLISH" : "BEARISH";
            let state: PatternLifecycleState = pD.isProvisional ? "DEVELOPING" : "COMPLETED";

            const przLevel = pD.price;
            const stopLoss = isBullish ? przLevel * 0.992 : przLevel * 1.008;

            if (isBullish && currentPrice > pD.price * 1.003) state = "CONFIRMED";
            else if (isBearish && currentPrice < pD.price * 0.997) state = "CONFIRMED";

            if ((isBullish && currentPrice < stopLoss) || (isBearish && currentPrice > stopLoss)) {
              state = "INVALIDATED";
            }

            const target1 = pD.price + (isBullish ? 0.382 * Math.abs(pC.price - pD.price) : -0.382 * Math.abs(pC.price - pD.price));
            const target2 = pD.price + (isBullish ? 0.618 * Math.abs(pC.price - pD.price) : -0.618 * Math.abs(pC.price - pD.price));

            const estTargetTs = latestTs + 8 * stepSec;

            const projection: FutureProjection = {
              projectedPoints: [
                { label: "Target 1 (38.2% CD)", timestamp: estTargetTs, price: target1, type: "TARGET", isProjected: true },
              ],
              projectedLines: [
                { from: { timestamp: latestTs, price: currentPrice }, to: { timestamp: estTargetTs, price: target1 }, style: "dashed", label: "Reversal Target" },
              ],
              targetZone: { price: target1, startTs: latestTs, endTs: estTargetTs + 4 * stepSec },
              breakoutLevel: przLevel,
              invalidationLevel: stopLoss,
              expectedBreakoutDirection: direction,
              estimatedTimeToCompletion: state === "CONFIRMED" ? "Target active" : "~4-6 bars",
              description: `${direction === "BULLISH" ? "Bullish" : "Bearish"} ${rule.name} D-point confirmed at ${rule.dTarget} PRZ level.`,
            };

            patterns.push({
              id: `${symbol}-${timeframe}-${rule.code}-${pX.timestamp}`,
              instrument: symbol,
              timeframe,
              family: "HARMONIC",
              pattern: rule.code,
              name: `${direction === "BULLISH" ? "Bullish" : "Bearish"} ${rule.name}`,
              direction,
              state,
              firstDetectedAt: pX.isoTime,
              lastUpdatedAt: pD.isoTime,
              startTime: pX.timestamp,
              endTime: pD.timestamp,
              keyPoints: [
                { label: "X", timestamp: pX.timestamp, price: pX.price },
                { label: "A", timestamp: pA.timestamp, price: pA.price },
                { label: "B", timestamp: pB.timestamp, price: pB.price },
                { label: "C", timestamp: pC.timestamp, price: pC.price },
                { label: "D", timestamp: pD.timestamp, price: pD.price, isProvisional: pD.isProvisional },
              ],
              projection,
              completenessScore: state === "CONFIRMED" ? 100 : 85,
              isDeveloping: state === "DEVELOPING",
              levels: {
                entry: przLevel,
                stopLoss,
                target1,
                target2,
                invalidationLevel: stopLoss,
              },
              progress: {
                percentage: state === "CONFIRMED" ? 100 : 85,
                description: state === "CONFIRMED" ? "Confirmed: Reversal impulse off PRZ" : `D-point formed at ${rule.dTarget} Fibonacci level`,
              },
            });
          }
        }
      }
    }

    // 2. Developing XABC Incomplete Harmonics (Projecting Point D into Future Space)
    const min4Start = activeOnly ? Math.max(0, swings.length - 4) : 0;
    for (let i = min4Start; i <= swings.length - 4; i++) {
      const window4 = swings.slice(i, i + 4);
      const [pX, pA, pB, pC] = window4;

      if (pX.type === pA.type || pA.type === pB.type || pB.type === pC.type) continue;

      const isBullish = pX.type === "LOW" && pA.type === "HIGH" && pB.type === "LOW" && pC.type === "HIGH";
      const isBearish = pX.type === "HIGH" && pA.type === "LOW" && pB.type === "HIGH" && pC.type === "LOW";
      if (!isBullish && !isBearish) continue;

      const legXA = Math.abs(pA.price - pX.price);
      if (legXA === 0) continue;

      const ratioB = calculateRetracement(pX.price, pA.price, pB.price);
      const ratioC = calculateRetracement(pA.price, pB.price, pC.price);

      for (const rule of HARMONIC_RULES) {
        if (ratioB >= rule.bMin && ratioB <= rule.bMax && ratioC >= rule.cMin && ratioC <= rule.cMax) {
          const direction = isBullish ? "BULLISH" : "BEARISH";

          // Calculate projected D price
          let projectedDPrice = 0;
          if (rule.dIsExtension) {
            projectedDPrice = isBullish ? pX.price - (rule.dTarget - 1) * legXA : pX.price + (rule.dTarget - 1) * legXA;
          } else {
            projectedDPrice = isBullish ? pA.price - rule.dTarget * legXA : pA.price + rule.dTarget * legXA;
          }

          const estDTs = latestTs + Math.max(4 * stepSec, pC.timestamp - pB.timestamp);
          const estTargetTs = estDTs + 6 * stepSec;
          const targetPrice = isBullish ? projectedDPrice + 0.382 * legXA : projectedDPrice - 0.382 * legXA;

          const przMin = isBullish ? projectedDPrice * 0.998 : projectedDPrice * 0.995;
          const przMax = isBullish ? projectedDPrice * 1.005 : projectedDPrice * 1.002;

          const projection: FutureProjection = {
            projectedPoints: [
              { label: `Proj. D PRZ (${rule.dTarget})`, timestamp: estDTs, price: projectedDPrice, type: "COMPLETION_ZONE", isProjected: true },
              { label: "Projected Target 1", timestamp: estTargetTs, price: targetPrice, type: "TARGET", isProjected: true },
            ],
            projectedLines: [
              { from: { timestamp: pC.timestamp, price: pC.price }, to: { timestamp: estDTs, price: projectedDPrice }, style: "dashed", label: "CD Leg Projection" },
              { from: { timestamp: estDTs, price: projectedDPrice }, to: { timestamp: estTargetTs, price: targetPrice }, style: "dotted", label: "Expected Reversal" },
            ],
            completionZone: {
              min: przMin,
              max: przMax,
              startTs: estDTs - stepSec,
              endTs: estDTs + stepSec,
              label: `Projected D PRZ: $${projectedDPrice.toFixed(1)}`,
            },
            targetZone: { price: targetPrice, startTs: estDTs, endTs: estTargetTs + 4 * stepSec },
            breakoutLevel: projectedDPrice,
            invalidationLevel: isBullish ? projectedDPrice * 0.99 : projectedDPrice * 1.01,
            expectedBreakoutDirection: direction,
            estimatedTimeToCompletion: "~4-8 bars",
            description: `Developing ${rule.name} (X-A-B-C confirmed). Projecting completion at D (${rule.dTarget} XA).`,
          };

          patterns.push({
            id: `${symbol}-${timeframe}-${rule.code}-DEV-${pX.timestamp}`,
            instrument: symbol,
            timeframe,
            family: "HARMONIC",
            pattern: rule.code,
            name: `${direction === "BULLISH" ? "Bullish" : "Bearish"} ${rule.name}`,
            direction,
            state: "DEVELOPING",
            firstDetectedAt: pX.isoTime,
            lastUpdatedAt: currentCandle.isoTime,
            startTime: pX.timestamp,
            endTime: pC.timestamp,
            keyPoints: [
              { label: "X", timestamp: pX.timestamp, price: pX.price },
              { label: "A", timestamp: pA.timestamp, price: pA.price },
              { label: "B", timestamp: pB.timestamp, price: pB.price },
              { label: "C", timestamp: pC.timestamp, price: pC.price },
            ],
            projection,
            completenessScore: 70,
            isDeveloping: true,
            levels: {
              entry: projectedDPrice,
              stopLoss: isBullish ? projectedDPrice * 0.992 : projectedDPrice * 1.008,
              target1: targetPrice,
              invalidationLevel: isBullish ? projectedDPrice * 0.99 : projectedDPrice * 1.01,
            },
            progress: {
              percentage: 70,
              description: `Developing X-A-B-C; projecting Point D completion at $${projectedDPrice.toFixed(1)}`,
            },
          });
        }
      }
    }

    return patterns;
  }
}
