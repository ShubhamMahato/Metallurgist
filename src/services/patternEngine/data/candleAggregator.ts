import { OHLCV, SupportedTimeframe } from "../types/candle";

/**
 * Aggregates a series of smaller OHLCV candles (e.g. 5m) into higher timeframe candles (e.g. 10m or 20m).
 * Assumes source candles are sorted in ascending chronological order.
 */
export function aggregateCandles(
  sourceCandles: OHLCV[],
  targetTimeframe: string
): OHLCV[] {
  if (sourceCandles.length === 0) return [];

  let targetDurationSec: number;
  let expectedSubBars: number;

  if (targetTimeframe === "10m") {
    targetDurationSec = 10 * 60; // 600 seconds
    expectedSubBars = 2; // 2 x 5m bars
  } else if (targetTimeframe === "20m") {
    targetDurationSec = 20 * 60; // 1200 seconds
    expectedSubBars = 4; // 4 x 5m bars
  } else {
    // If not a derived timeframe, return as is
    return sourceCandles;
  }

  const buckets = new Map<number, OHLCV[]>();

  for (const bar of sourceCandles) {
    // Strictly align bucket key to UTC time boundaries (seconds since Unix epoch)
    // 10m: :00, :10, :20, :30, :40, :50 UTC
    // 20m: :00, :20, :40 UTC
    const bucketStart = Math.floor(bar.timestamp / targetDurationSec) * targetDurationSec;
    const existing = buckets.get(bucketStart);
    if (!existing) {
      buckets.set(bucketStart, [bar]);
    } else {
      existing.push(bar);
    }
  }

  const aggregated: OHLCV[] = [];
  const sortedBucketKeys = Array.from(buckets.keys()).sort((a, b) => a - b);

  for (let i = 0; i < sortedBucketKeys.length; i++) {
    const bucketStart = sortedBucketKeys[i];
    const barsInBucket = buckets.get(bucketStart)!;
    if (barsInBucket.length === 0) continue;

    const isLatestBucket = i === sortedBucketKeys.length - 1;

    // If the earliest bucket in history has fewer than expected bars and there are subsequent buckets,
    // skip it to prevent truncated/distorted open price on the first candle of the chart.
    if (i === 0 && barsInBucket.length < expectedSubBars && sortedBucketKeys.length > 1) {
      continue;
    }

    const first = barsInBucket[0];
    const last = barsInBucket[barsInBucket.length - 1];

    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    let tickVolume = 0;

    for (const b of barsInBucket) {
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      volume += b.volume || 0;
      tickVolume += b.tickVolume || 0;
    }

    // A candle is open (forming) if it is the latest bucket AND (any sub-candle is open OR it hasn't gathered all expected sub-bars yet)
    const hasOpenSubBar = barsInBucket.some((b) => b.isOpen);
    const isBucketIncomplete = barsInBucket.length < expectedSubBars;
    const isOpen = isLatestBucket ? hasOpenSubBar || isBucketIncomplete : false;

    aggregated.push({
      timestamp: bucketStart,
      isoTime: new Date(bucketStart * 1000).toISOString(),
      open: first.open,
      high,
      low,
      close: last.close,
      volume,
      tickVolume,
      isOpen,
    });
  }

  return aggregated;
}
