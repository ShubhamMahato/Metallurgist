export const FIBONACCI_RATIOS = {
  R_0_236: 0.236,
  R_0_382: 0.382,
  R_0_500: 0.500,
  R_0_618: 0.618,
  R_0_707: 0.707,
  R_0_786: 0.786,
  R_0_886: 0.886,
  R_1_130: 1.130,
  R_1_272: 1.272,
  R_1_414: 1.414,
  R_1_618: 1.618,
  R_2_000: 2.000,
  R_2_240: 2.240,
  R_2_618: 2.618,
  R_3_140: 3.140,
  R_3_618: 3.618,
} as const;

/**
 * Checks if an observed ratio falls within target ratio ± tolerance percentage
 * @param actual Observed ratio (e.g. 0.62)
 * @param target Target Fibonacci ratio (e.g. 0.618)
 * @param tolerancePct Maximum allowed deviation percentage (e.g. 0.08 for ±8%)
 */
export function isWithinRatio(actual: number, target: number, tolerancePct: number = 0.08): boolean {
  if (isNaN(actual) || target === 0) return false;
  const deviation = Math.abs(actual - target) / target;
  return deviation <= tolerancePct;
}

/**
 * Calculates retracement of point B relative to leg XA
 * Formula: |priceB - priceA| / |priceA - priceX|
 */
export function calculateRetracement(priceX: number, priceA: number, priceB: number): number {
  const legXA = Math.abs(priceA - priceX);
  if (legXA === 0) return 0;
  return Math.abs(priceB - priceA) / legXA;
}

/**
 * Calculates extension/projection of leg CD relative to BC or XA
 */
export function calculateProjection(baseStart: number, baseEnd: number, targetStart: number, targetEnd: number): number {
  const baseLeg = Math.abs(baseEnd - baseStart);
  if (baseLeg === 0) return 0;
  const targetLeg = Math.abs(targetEnd - targetStart);
  return targetLeg / baseLeg;
}
