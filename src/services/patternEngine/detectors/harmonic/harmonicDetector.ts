import { OHLCV, SupportedTimeframe } from "../../types/candle";
import { SwingPoint } from "../../core/swingDetector";
import { DetectedPattern, PatternLifecycleState } from "../../types/pattern";
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
    if (swings.length < 4) return patterns;

    const currentPrice = candles[candles.length - 1].close;

    // 1. Five-point XABCD Harmonics (focus on active formation if activeOnly is true)
    const minHarmonicStart = activeOnly ? Math.max(0, swings.length - 5) : 0;
    for (let i = minHarmonicStart; i <= swings.length - 5; i++) {
      const window = swings.slice(i, i + 5);
      const [pX, pA, pB, pC, pD] = window;

      // Must strictly alternate
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

            // PRZ (Potential Reversal Zone)
            const przLevel = pD.price;
            const stopLoss = isBullish ? przLevel * 0.992 : przLevel * 1.008;

            if (isBullish && currentPrice > pD.price * 1.003) {
              state = "CONFIRMED";
            } else if (isBearish && currentPrice < pD.price * 0.997) {
              state = "CONFIRMED";
            }

            if ((isBullish && currentPrice < stopLoss) || (isBearish && currentPrice > stopLoss)) {
              state = "INVALIDATED";
            }

            const target1 = pD.price + (isBullish ? 0.382 * Math.abs(pC.price - pD.price) : -0.382 * Math.abs(pC.price - pD.price));
            const target2 = pD.price + (isBullish ? 0.618 * Math.abs(pC.price - pD.price) : -0.618 * Math.abs(pC.price - pD.price));

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
              levels: {
                entry: przLevel,
                stopLoss,
                target1,
                target2,
                invalidationLevel: stopLoss,
              },
              progress: {
                percentage: state === "CONFIRMED" ? 100 : state === "COMPLETED" ? 85 : 65,
                description:
                  state === "CONFIRMED"
                    ? "Confirmed: Reversal impulse validated off PRZ"
                    : `D-point formed at ${rule.dTarget} Fibonacci level`,
              },
              metadata: {
                ratioB: Number(ratioB.toFixed(3)),
                ratioC: Number(ratioC.toFixed(3)),
                ratioD: Number(ratioD.toFixed(3)),
                targetRatioD: rule.dTarget,
              },
              explanation: `Fibonacci Ratios: B retraced ${(ratioB * 100).toFixed(1)}% of XA, C reached ${(ratioC * 100).toFixed(1)}% of AB, D projected at ${ratioD.toFixed(3)} XA.`,
            });
            break; // Matched harmonic rule
          }
        }
      }
    }

    // 2. AB=CD Pattern (4 points: A, B, C, D)
    const minAbcdStart = activeOnly ? Math.max(0, swings.length - 4) : 0;
    for (let i = minAbcdStart; i <= swings.length - 4; i++) {
      const [pA, pB, pC, pD] = swings.slice(i, i + 4);
      if (pA.type === pB.type || pB.type === pC.type || pC.type === pD.type) continue;

      const legAB = Math.abs(pB.price - pA.price);
      const legCD = Math.abs(pD.price - pC.price);
      if (legAB === 0) continue;

      const equalityRatio = legCD / legAB;
      if (isWithinRatio(equalityRatio, 1.0, 0.12)) {
        const isBullish = pD.type === "LOW";
        const direction = isBullish ? "BULLISH" : "BEARISH";
        const state: PatternLifecycleState = pD.isProvisional ? "DEVELOPING" : "COMPLETED";

        patterns.push({
          id: `${symbol}-${timeframe}-ABCD-${pA.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "HARMONIC",
          pattern: "AB_CD",
          name: `${direction === "BULLISH" ? "Bullish" : "Bearish"} AB=CD`,
          direction,
          state,
          firstDetectedAt: pA.isoTime,
          lastUpdatedAt: pD.isoTime,
          startTime: pA.timestamp,
          endTime: pD.timestamp,
          keyPoints: [
            { label: "A", timestamp: pA.timestamp, price: pA.price },
            { label: "B", timestamp: pB.timestamp, price: pB.price },
            { label: "C", timestamp: pC.timestamp, price: pC.price },
            { label: "D", timestamp: pD.timestamp, price: pD.price, isProvisional: pD.isProvisional },
          ],
          levels: {
            entry: pD.price,
            target1: pD.price + (isBullish ? 0.618 * legCD : -0.618 * legCD),
            stopLoss: isBullish ? pD.price * 0.993 : pD.price * 1.007,
          },
          progress: {
            percentage: state === "COMPLETED" ? 85 : 65,
            description: `Leg CD reached ${(equalityRatio * 100).toFixed(1)}% of Leg AB symmetry`,
          },
          metadata: {
            equalityRatio: Number(equalityRatio.toFixed(3)),
          },
        });
      }
    }

    return patterns;
  }
}
