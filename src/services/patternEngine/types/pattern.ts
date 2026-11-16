import { SupportedTimeframe } from "./candle";

export type PatternFamily =
  | "CANDLESTICK"
  | "CLASSICAL_CHART"
  | "HARMONIC"
  | "MARKET_STRUCTURE"
  | "STATISTICAL";

export type PatternDirection = "BULLISH" | "BEARISH" | "NEUTRAL";

export type PatternLifecycleState =
  | "FORMING"
  | "DEVELOPING"
  | "COMPLETED"
  | "CONFIRMED"
  | "INVALIDATED"
  | "EXPIRED";

export interface KeyPoint {
  label: string; // e.g. "X", "A", "B", "C", "D", "LeftShoulder", "Head", "RightShoulder", "Neckline1", "Neckline2"
  timestamp: number; // Unix seconds
  price: number;
  isProvisional?: boolean;
}

export interface PatternLevels {
  entry?: number;
  stopLoss?: number;
  target1?: number;
  target2?: number;
  neckline?: number;
  breakoutLevel?: number;
  invalidationLevel?: number;
  upperBoundary?: number;
  lowerBoundary?: number;
  supportLevel?: number;
  resistanceLevel?: number;
  [key: string]: number | undefined;
}

export interface ConditionRule {
  description: string;
  priceLevel?: number;
  operator?: ">" | "<" | ">=" | "<=" | "CROSS_ABOVE" | "CROSS_BELOW";
  isMet?: boolean;
}

export interface DetectedPattern {
  id: string; // Stable unique identifier (e.g., "XAUUSD-5m-GARTLEY-1698765432")
  instrument: string; // e.g. "XAUUSD"
  timeframe: SupportedTimeframe;
  family: PatternFamily;
  pattern: string; // Pattern code name, e.g. "HEAD_AND_SHOULDERS"
  name: string; // User-facing name, e.g. "Head and Shoulders"
  direction: PatternDirection;
  state: PatternLifecycleState;
  firstDetectedAt: string; // ISO 8601
  lastUpdatedAt: string; // ISO 8601
  startTime: number; // Unix timestamp seconds
  endTime: number; // Unix timestamp seconds
  keyPoints: KeyPoint[];
  levels: PatternLevels;
  progress?: {
    percentage: number; // 0 - 100
    description: string; // Exact explanation of how progress is computed
  };
  confirmationCondition?: ConditionRule;
  invalidationCondition?: ConditionRule;
  metadata?: Record<string, any>; // Ratio checks, indicators, volume delta, notes
  explanation?: string;
}

export interface PatternFilter {
  families: PatternFamily[];
  directions: PatternDirection[];
  states: PatternLifecycleState[];
  timeframe?: SupportedTimeframe;
  searchQuery?: string;
}
