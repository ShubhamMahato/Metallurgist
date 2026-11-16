export type SupportedTimeframe =
  | "1m"
  | "5m"
  | "10m"
  | "15m"
  | "20m"
  | "30m"
  | "1h"
  | "4h"
  | "1d";

export interface OHLCV {
  timestamp: number; // Unix timestamp in seconds
  isoTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickVolume?: number;
  isOpen?: boolean; // true if current/incomplete candle
}

export interface BiquoteRawBar {
  openTime: string; // ISO 8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickVolume?: number;
  isOpen: boolean;
}

export interface BiquoteResponse {
  symbol: string;
  interval: string;
  bars: BiquoteRawBar[];
  message?: string;
}

export const TIMEFRAMES: { id: SupportedTimeframe; label: string; minutes: number; isDerived?: boolean }[] = [
  { id: "1m", label: "1m", minutes: 1 },
  { id: "5m", label: "5m", minutes: 5 },
  { id: "10m", label: "10m", minutes: 10, isDerived: true },
  { id: "15m", label: "15m", minutes: 15 },
  { id: "20m", label: "20m", minutes: 20, isDerived: true },
  { id: "30m", label: "30m", minutes: 30 },
  { id: "1h", label: "1H", minutes: 60 },
  { id: "4h", label: "4H", minutes: 240 },
  { id: "1d", label: "1D", minutes: 1440 },
];
