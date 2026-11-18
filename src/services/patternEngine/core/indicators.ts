import { OHLCV } from "../types/candle";

export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result[i] = sum / period;
  }
  return result;
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i] - prevEma) * multiplier + prevEma;
    result[i] = currentEma;
    prevEma = currentEma;
  }
  return result;
}

export function calculateStdDev(data: number[], period: number, sma: (number | null)[]): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    const mean = sma[i];
    if (mean === null) continue;
    let sumSquares = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSquares += Math.pow(data[j] - mean, 2);
    }
    result[i] = Math.sqrt(sumSquares / period);
  }
  return result;
}

export interface BollingerBandsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
}

export function calculateBollingerBands(
  candles: OHLCV[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsResult {
  const closes = candles.map((c) => c.close);
  const middle = calculateSMA(closes, period);
  const stdDev = calculateStdDev(closes, period, middle);

  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);
  const bandwidth: (number | null)[] = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const m = middle[i];
    const s = stdDev[i];
    if (m !== null && s !== null) {
      upper[i] = m + stdDevMultiplier * s;
      lower[i] = m - stdDevMultiplier * s;
      bandwidth[i] = (upper[i]! - lower[i]!) / m;
    }
  }

  return { upper, middle, lower, bandwidth };
}

export function calculateTrueRange(candles: OHLCV[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }
  }
  return tr;
}

export function calculateATR(candles: OHLCV[], period: number = 14): (number | null)[] {
  const tr = calculateTrueRange(candles);
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / period;
  result[period - 1] = prevAtr;

  for (let i = period; i < candles.length; i++) {
    const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
    result[i] = currentAtr;
    prevAtr = currentAtr;
  }
  return result;
}

export interface KeltnerChannelResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateKeltnerChannels(
  candles: OHLCV[],
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  atrMultiplier: number = 1.5
): KeltnerChannelResult {
  const closes = candles.map((c) => c.close);
  const middle = calculateEMA(closes, emaPeriod);
  const atr = calculateATR(candles, atrPeriod);

  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const m = middle[i];
    const a = atr[i];
    if (m !== null && a !== null) {
      upper[i] = m + atrMultiplier * a;
      lower[i] = m - atrMultiplier * a;
    }
  }

  return { upper, middle, lower };
}

export function calculateRSI(candles: OHLCV[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

export interface MACDResult {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  candles: OHLCV[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const closes = candles.map((c) => c.close);
  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);

  const macdLineRaw: number[] = [];
  const macdLine: (number | null)[] = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const f = fastEma[i];
    const s = slowEma[i];
    if (f !== null && s !== null) {
      const val = f - s;
      macdLine[i] = val;
      macdLineRaw.push(val);
    }
  }

  const signalLineRaw = calculateEMA(macdLineRaw, signalPeriod);
  const signalLine: (number | null)[] = new Array(candles.length).fill(null);
  const histogram: (number | null)[] = new Array(candles.length).fill(null);

  let rawIdx = 0;
  for (let i = 0; i < candles.length; i++) {
    if (macdLine[i] !== null) {
      const sig = signalLineRaw[rawIdx];
      signalLine[i] = sig;
      if (sig !== null) {
        histogram[i] = macdLine[i]! - sig;
      }
      rawIdx++;
    }
  }

  return { macdLine, signalLine, histogram };
}

export interface SupertrendResult {
  trend: ("BULLISH" | "BEARISH" | null)[];
  supertrend: (number | null)[];
}

export function calculateSupertrend(
  candles: OHLCV[],
  period: number = 10,
  multiplier: number = 3
): SupertrendResult {
  const n = candles.length;
  const trend: ("BULLISH" | "BEARISH" | null)[] = new Array(n).fill(null);
  const supertrend: (number | null)[] = new Array(n).fill(null);

  if (n < period) return { trend, supertrend };

  const atr = calculateATR(candles, period);
  const upperBand: number[] = new Array(n).fill(0);
  const lowerBand: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const a = atr[i] ?? (c.high - c.low);
    const hl2 = (c.high + c.low) / 2;

    const basicUpper = hl2 + multiplier * a;
    const basicLower = hl2 - multiplier * a;

    if (i === 0) {
      upperBand[i] = basicUpper;
      lowerBand[i] = basicLower;
      trend[i] = c.close >= basicLower ? "BULLISH" : "BEARISH";
      supertrend[i] = trend[i] === "BULLISH" ? lowerBand[i] : upperBand[i];
      continue;
    }

    const prevClose = candles[i - 1].close;
    const prevUpper = upperBand[i - 1];
    const prevLower = lowerBand[i - 1];

    upperBand[i] = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
    lowerBand[i] = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;

    const prevTrend = trend[i - 1] ?? "BULLISH";

    if (prevTrend === "BULLISH") {
      if (c.close < lowerBand[i]) {
        trend[i] = "BEARISH";
        supertrend[i] = upperBand[i];
      } else {
        trend[i] = "BULLISH";
        supertrend[i] = lowerBand[i];
      }
    } else {
      if (c.close > upperBand[i]) {
        trend[i] = "BULLISH";
        supertrend[i] = lowerBand[i];
      } else {
        trend[i] = "BEARISH";
        supertrend[i] = upperBand[i];
      }
    }
  }

  return { trend, supertrend };
}

export interface StochasticResult {
  k: (number | null)[];
  d: (number | null)[];
}

export function calculateStochastic(
  candles: OHLCV[],
  periodK: number = 14,
  smoothK: number = 3,
  periodD: number = 3
): StochasticResult {
  const n = candles.length;
  const rawK: (number | null)[] = new Array(n).fill(null);

  for (let i = periodK - 1; i < n; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - periodK + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }
    const range = highestHigh - lowestLow;
    rawK[i] = range === 0 ? 50 : ((candles[i].close - lowestLow) / range) * 100;
  }

  const validK = rawK.map((v) => v ?? 50);
  const k = calculateSMA(validK, smoothK);
  const validSmoothK = k.map((v) => v ?? 50);
  const d = calculateSMA(validSmoothK, periodD);

  return { k, d };
}

export function calculateVWAP(candles: OHLCV[]): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  let cumVol = 0;
  let cumVolPrice = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = (c.volume && c.volume > 0) ? c.volume : (c.tickVolume || 1);
    cumVol += vol;
    cumVolPrice += typicalPrice * vol;
    result[i] = cumVol === 0 ? typicalPrice : cumVolPrice / cumVol;
  }
  return result;
}
