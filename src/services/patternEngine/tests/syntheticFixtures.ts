import { OHLCV } from "../types/candle";

/**
 * Generates synthetic OHLCV bars based on an array of close prices.
 */
export function generateCandlesFromPrices(
  prices: number[],
  startTimestamp: number = 1700000000,
  intervalSeconds: number = 300
): OHLCV[] {
  return prices.map((price, idx) => {
    const prev = idx > 0 ? prices[idx - 1] : price;
    const isBull = price >= prev;
    const open = isBull ? prev + 0.2 : prev - 0.2;
    const close = price;
    const high = Math.max(open, close) + 0.8;
    const low = Math.min(open, close) - 0.8;
    const ts = startTimestamp + idx * intervalSeconds;

    return {
      timestamp: ts,
      isoTime: new Date(ts * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume: 100,
      tickVolume: 50,
      isOpen: false,
    };
  });
}


/**
 * Fixture: Perfect Head and Shoulders Formation
 * Base at ~1900, Left Shoulder at 1940, Head at 1980, Right Shoulder at 1940, Troughs at 1910
 */
export function createHeadAndShouldersFixture(): OHLCV[] {
  // Construct a sequence of prices that produces:
  // L1 (1910), Left Shoulder (1940), T1 (1912), Head (1980), T2 (1911), Right Shoulder (1941), Breakout (1905)
  const trajectory: number[] = [
    1910, 1915, 1925, 1935, 1940, 1935, 1925, 1915, 1912, 1915,
    1930, 1950, 1970, 1980, 1965, 1945, 1925, 1915, 1911, 1915,
    1928, 1938, 1941, 1935, 1920, 1912, 1905, 1898
  ];
  return generateCandlesFromPrices(trajectory);
}

/**
 * Fixture: Double Bottom Formation
 * Floor at 1900, Peak at 1930, Second Floor at 1901, Breakout at 1935
 */
export function createDoubleBottomFixture(): OHLCV[] {
  const trajectory: number[] = [
    1920, 1910, 1905, 1900, 1908, 1918, 1925, 1930, 1922, 1912,
    1906, 1901, 1907, 1916, 1924, 1932, 1936, 1942
  ];
  return generateCandlesFromPrices(trajectory);
}

/**
 * Fixture: Bullish Engulfing Candle Pair
 */
export function createBullishEngulfingFixture(): OHLCV[] {
  const baseTs = 1700000000;
  return [
    { timestamp: baseTs, isoTime: new Date(baseTs * 1000).toISOString(), open: 1950, high: 1952, low: 1938, close: 1940, volume: 100, isOpen: false },
    { timestamp: baseTs + 300, isoTime: new Date((baseTs + 300) * 1000).toISOString(), open: 1939, high: 1958, low: 1937, close: 1955, volume: 250, isOpen: false },
  ];
}

/**
 * Fixture: Hammer Candle
 */
export function createHammerFixture(): OHLCV[] {
  const baseTs = 1700000000;
  return [
    { timestamp: baseTs - 600, isoTime: "2026-01-01T00:00:00Z", open: 1960, high: 1962, low: 1948, close: 1950, volume: 100, isOpen: false },
    { timestamp: baseTs - 300, isoTime: "2026-01-01T00:05:00Z", open: 1950, high: 1952, low: 1938, close: 1940, volume: 100, isOpen: false },
    // Hammer: Small body at top (1939-1942), long lower shadow down to 1920, tiny upper wick
    { timestamp: baseTs, isoTime: "2026-01-01T00:10:00Z", open: 1939, high: 1943, low: 1920, close: 1942, volume: 180, isOpen: false },
  ];
}

/**
 * Fixture: Bullish Gartley Harmonic Formation
 * X: 1900, A: 2000 (XA = 100)
 * B: 1938.2 (retraces 61.8% of XA)
 * C: 1976.4 (retraces 61.8% of AB)
 * D: 1921.4 (retraces 78.6% of XA)
 */
export function createBullishGartleyFixture(): OHLCV[] {
  const trajectory: number[] = [
    // Leg X to A
    1900, 1925, 1950, 1975, 2000,
    // Leg A to B (retrace ~61.8% -> 1938)
    1985, 1965, 1945, 1938,
    // Leg B to C (retrace -> 1976)
    1948, 1962, 1976,
    // Leg C to D (down to 1921)
    1960, 1940, 1921,
    // Reversal confirmation
    1928, 1935
  ];
  return generateCandlesFromPrices(trajectory);
}
