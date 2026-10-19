export interface MetalHistory {
  from: number;
  to: number;
  delta: number;
  percent: number;
  source: string;
}

export interface MetalValue {
  id: string;
  name: string;
  symbol: string;
  value: string;
  locked?: boolean;
  color: string;
  textColor: string;

  previous?: number;
  delta?: number;
  percentChange?: number;
  changed?: boolean;

  baseline?: number;
  isManual?: boolean;
  lastAdjustedBy?: string;
  history?: MetalHistory[];
}

export interface MetalInfo {
  name: string;
  color: string;
  textColor: string;
}

export interface AvailableMetal {
  id: string;
  symbol: string;
  name: string;
}
