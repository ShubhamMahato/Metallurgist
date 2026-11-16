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
  label: string; // e.g. "Left Rim", "Cup Bottom", "Right Rim", "Handle Trough", "Head", "Neckline"
  timestamp: number; // Unix seconds
  price: number;
  isProvisional?: boolean;
}

export interface ProjectedPoint {
  label: string; // e.g. "Est. Handle", "Projected D (PRZ)", "Breakout Zone", "Target 1"
  timestamp: number; // Future Unix seconds projected into right-side chart space
  price: number;
  type: "ESTIMATED_POINT" | "BREAKOUT" | "TARGET" | "INVALIDATION" | "COMPLETION_ZONE";
  isProjected: true;
}

export interface ProjectedLine {
  from: { timestamp: number; price: number };
  to: { timestamp: number; price: number };
  style: "dashed" | "dotted";
  label?: string;
  color?: string;
}

export interface FutureProjection {
  projectedPoints: ProjectedPoint[];
  projectedLines?: ProjectedLine[];
  completionZone?: {
    min: number;
    max: number;
    startTs: number;
    endTs: number;
    label?: string;
  };
  targetZone?: {
    price: number;
    startTs: number;
    endTs: number;
    label?: string;
  };
  breakoutLevel: number;
  invalidationLevel: number;
  expectedBreakoutDirection: PatternDirection;
  estimatedTimeToCompletion?: string; // e.g. "~3-5 candles"
  description: string;
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
  pattern: string; // Pattern code name, e.g. "CUP_AND_HANDLE", "HEAD_AND_SHOULDERS"
  name: string; // User-facing name, e.g. "Cup and Handle"
  direction: PatternDirection;
  state: PatternLifecycleState;
  firstDetectedAt: string; // ISO 8601
  lastUpdatedAt: string; // ISO 8601
  startTime: number; // Unix timestamp seconds
  endTime: number; // Unix timestamp seconds
  keyPoints: KeyPoint[]; // Actual historical candle points
  projection?: FutureProjection; // Future forward-looking projection
  completenessScore?: number; // 0 - 100 structural completeness
  isDeveloping?: boolean;
  levels: PatternLevels;
  progress?: {
    percentage: number; // 0 - 100
    description: string; // Exact explanation of how progress is computed
  };
  confidence?: number;
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
