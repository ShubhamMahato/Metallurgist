import { BiquoteRawBar, BiquoteResponse, OHLCV, SupportedTimeframe } from "../types/candle";
import { aggregateCandles } from "./candleAggregator";
import { CandleStore } from "./candleStore";

export interface TimeframeDiagnostic {
  selectedTimeframe: SupportedTimeframe;
  apiIntervalRequested: string;
  apiResponseInterval: string;
  rawOpenTime: string;
  parsedUnixTs: number;
  diffSec: number;
  displayedAxisLabelIST: string;
  candleCount: number;
}

export interface ProviderStatus {
  isPolling: boolean;
  isLoading: boolean;
  lastPollTime: string | null;
  error: string | null;
  candleCount: number;
  marketState?: string;
  diagnostic?: TimeframeDiagnostic;
}

export class BiquoteDataProvider {
  private symbol: string = "XAUUSD";
  private timeframe: SupportedTimeframe = "5m";
  private store: CandleStore;
  private pollIntervalMs: number = 10000;
  private timerId: any = null;
  private abortController: AbortController | null = null;
  private statusListeners: Set<(status: ProviderStatus) => void> = new Set();
  private isPollingActive: boolean = false;
  private isFetching: boolean = false;
  private lastPollIso: string | null = null;
  private lastError: string | null = null;
  private marketState: string = "open";
  private latestDiagnostic?: TimeframeDiagnostic;
  private currentRequestId: number = 0;

  constructor(store: CandleStore) {
    this.store = store;
  }

  public setTimeframe(tf: SupportedTimeframe): void {
    if (this.timeframe === tf) return;
    this.timeframe = tf;
    this.currentRequestId++;

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Always clear the store on timeframe switch so candles are not mixed
    this.store.clear();
    this.notifyStatus();

    // Restart polling with new timeframe if already running
    if (this.isPollingActive) {
      this.fetchInitial(1000).then(() => {
        if (this.isPollingActive) {
          this.scheduleNextPoll();
        }
      });
    }
  }

  public setPollInterval(ms: number): void {
    this.pollIntervalMs = Math.max(3000, ms);
    if (this.isPollingActive) {
      this.restartPolling();
    }
  }

  public start(): void {
    if (this.isPollingActive) return;
    this.isPollingActive = true;
    this.notifyStatus();
    this.fetchInitial(1000).then(() => {
      this.scheduleNextPoll();
    });
  }

  public stop(): void {
    this.isPollingActive = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.notifyStatus();
  }

  public async refreshNow(): Promise<void> {
    await this.fetchUpdate(15);
  }

  public subscribeStatus(cb: (status: ProviderStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.getStatus());
    return () => this.statusListeners.delete(cb);
  }

  public getStatus(): ProviderStatus {
    return {
      isPolling: this.isPollingActive,
      isLoading: this.isFetching,
      lastPollTime: this.lastPollIso,
      error: this.lastError,
      candleCount: this.store.getAll().length,
      marketState: this.marketState,
      diagnostic: this.latestDiagnostic,
    };
  }

  private scheduleNextPoll(): void {
    if (!this.isPollingActive) return;
    if (this.timerId) clearTimeout(this.timerId);

    this.timerId = setTimeout(async () => {
      if (!this.isPollingActive) return;
      await this.fetchUpdate(15);
      this.scheduleNextPoll();
    }, this.pollIntervalMs);
  }

  private restartPolling(): void {
    if (this.timerId) clearTimeout(this.timerId);
    this.scheduleNextPoll();
  }

  /**
   * Initial load: downloads historical dataset (e.g. 250 bars)
   */
  private async fetchInitial(limit: number = 250): Promise<void> {
    const requestId = this.currentRequestId;
    this.isFetching = true;
    this.lastError = null;
    this.notifyStatus();

    try {
      const candles = await this.requestBiquote(this.timeframe, limit);
      // Guard against race condition: only apply if this is still the active request
      if (requestId === this.currentRequestId) {
        this.store.set(candles);
        this.lastPollIso = new Date().toISOString();
        this.lastError = null;
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && requestId === this.currentRequestId) {
        this.lastError = err.message || "Failed to fetch initial candles";
        console.warn("[BiquoteDataProvider] fetchInitial error:", err);
      }
    } finally {
      if (requestId === this.currentRequestId) {
        this.isFetching = false;
        this.notifyStatus();
      }
    }
  }

  /**
   * Incremental update: fetches only recent bars (e.g. 15 bars) to refresh the active/last closed candle
   */
  private async fetchUpdate(limit: number = 15): Promise<void> {
    if (this.isFetching) return;
    const requestId = this.currentRequestId;
    this.isFetching = true;
    this.notifyStatus();

    try {
      const candles = await this.requestBiquote(this.timeframe, limit);
      if (requestId === this.currentRequestId) {
        this.store.merge(candles);
        this.lastPollIso = new Date().toISOString();
        this.lastError = null;
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && requestId === this.currentRequestId) {
        this.lastError = err.message || "Failed to update candles";
        console.warn("[BiquoteDataProvider] fetchUpdate error:", err);
      }
    } finally {
      if (requestId === this.currentRequestId) {
        this.isFetching = false;
        this.notifyStatus();
      }
    }
  }

  /**
   * Request OHLC candles with exact timeframe mapping:
   * Native intervals: 1m, 5m, 15m, 30m, 1h, 4h, 1d (direct from Biquote)
   * Derived intervals: 10m (2x 5m), 20m (4x 5m) (aggregated on UTC boundaries)
   */
  private async requestBiquote(
    tf: SupportedTimeframe,
    limit: number
  ): Promise<OHLCV[]> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    // 1. Determine requested Biquote API interval & multiplier
    let apiInterval: string = tf;
    let multiplier = 1;

    if (tf === "10m") {
      apiInterval = "5m";
      multiplier = 2;
    } else if (tf === "20m") {
      apiInterval = "5m";
      multiplier = 4;
    }

    const requestedLimit = Math.min(1000, Math.max(limit * multiplier + 10, 250));
    const url = `https://biquote.io/api/${this.symbol}/ohlc?interval=${apiInterval}&limit=${requestedLimit}`;

    const res = await fetch(url, {
      signal: this.abortController.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("Biquote API rate limit reached. Pausing...");
      }
      throw new Error(`Biquote returned HTTP ${res.status}`);
    }

    const data: BiquoteResponse = await res.json();
    if (!data || !Array.isArray(data.bars)) {
      throw new Error("Invalid response format from Biquote API");
    }

    // Verify API response interval matches the requested interval
    if (data.interval !== apiInterval) {
      console.warn(`[BiquoteDataProvider] Interval mismatch: requested '${apiInterval}', received '${data.interval}'`);
    }

    // Convert raw bars into normalized OHLCV format strictly in UTC Unix seconds
    // Biquote returns newest first; reverse to strict ascending chronological order
    const rawBars = [...data.bars].reverse();
    const normalized: OHLCV[] = rawBars.map((b: BiquoteRawBar) => {
      // Parse ISO timestamp strictly as UTC milliseconds and convert to Unix seconds
      const ts = Math.floor(Date.parse(b.openTime) / 1000);
      return {
        timestamp: ts,
        isoTime: b.openTime,
        open: Number(b.open),
        high: Number(b.high),
        low: Number(b.low),
        close: Number(b.close),
        volume: Number(b.volume || 0),
        tickVolume: Number(b.tickVolume || 0),
        isOpen: Boolean(b.isOpen),
      };
    });

    // Aggregate only when necessary (10m and 20m from 5m source candles)
    const finalCandles = (tf === "10m" || tf === "20m")
      ? aggregateCandles(normalized, tf)
      : normalized;

    // Build temporary diagnostics
    if (finalCandles.length > 0) {
      const lastCandle = finalCandles[finalCandles.length - 1];
      const prevCandle = finalCandles.length > 1 ? finalCandles[finalCandles.length - 2] : null;
      const diffSec = prevCandle ? lastCandle.timestamp - prevCandle.timestamp : 0;

      const displayedAxisLabelIST = new Date(lastCandle.timestamp * 1000).toLocaleTimeString("en-GB", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      this.latestDiagnostic = {
        selectedTimeframe: tf,
        apiIntervalRequested: apiInterval,
        apiResponseInterval: data.interval,
        rawOpenTime: lastCandle.isoTime,
        parsedUnixTs: lastCandle.timestamp,
        diffSec,
        displayedAxisLabelIST,
        candleCount: finalCandles.length,
      };

      console.info("[Biquote Diagnostic]", this.latestDiagnostic);
    }

    return finalCandles;
  }

  private notifyStatus(): void {
    const s = this.getStatus();
    for (const l of this.statusListeners) {
      try {
        l(s);
      } catch {}
    }
  }
}
