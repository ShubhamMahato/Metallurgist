import * as signalR from "@microsoft/signalr";
import {
  BiquoteRawBar,
  BiquoteResponse,
  OHLCV,
  SupportedTimeframe,
  TIMEFRAMES,
} from "../types/candle";
import { aggregateCandles } from "./candleAggregator";
import { CandleStore } from "./candleStore";

export type SocketConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "live"
  | "reconnecting"
  | "error";

export interface BiquoteTick {
  symbol: string;
  bid: number;
  ask: number;
  mid?: number;
  last?: number;
  volume?: number;
  timestamp: string; // ISO 8601 UTC string (e.g. 2026-11-16T13:26:18Z)
  source?: string;
  high?: number;
  low?: number;
  direction?: string;
  dayDiffPercent?: number;
  spread?: number;
}

export interface SocketProviderStatus {
  state: SocketConnectionState;
  lastTickIso: string | null;
  lastPrice: number | null;
  tickCount: number;
  error: string | null;
  candleCount: number;
  timeframe: SupportedTimeframe;
}

export class BiquoteSocketProvider {
  private symbol: string = "XAUUSD";
  private timeframe: SupportedTimeframe = "5m";
  private store: CandleStore;
  private connection: signalR.HubConnection | null = null;
  private statusListeners: Set<(status: SocketProviderStatus) => void> = new Set();
  
  private isActive: boolean = false;
  private connectionState: SocketConnectionState = "disconnected";
  private lastTickIso: string | null = null;
  private lastPrice: number | null = null;
  private tickCount: number = 0;
  private lastError: string | null = null;
  private abortController: AbortController | null = null;
  private currentRequestId: number = 0;

  // Stored active forming candle bucket for the selected timeframe
  private activeBucketTs: number | null = null;

  constructor(store: CandleStore) {
    this.store = store;
  }

  public setTimeframe(tf: SupportedTimeframe): void {
    if (this.timeframe === tf) return;
    this.timeframe = tf;
    this.currentRequestId++;
    this.activeBucketTs = null;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Clear store on timeframe switch so candles are not mixed
    this.store.clear();
    this.notifyStatus();

    if (this.isActive) {
      // Re-seed historical candles for the new timeframe
      this.seedInitialHistory(1000).catch((err) => {
        console.warn("[BiquoteSocketProvider] Failed to seed history on tf change:", err);
      });
    }
  }

  public async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;
    this.lastError = null;
    this.connectionState = "connecting";
    this.notifyStatus();

    // 1. Seed historical dataset so the chart has candles
    await this.seedInitialHistory(1000);

    // 2. Start or connect SignalR connection
    await this.initSocketConnection();
  }

  public async stop(): Promise<void> {
    this.isActive = false;
    this.connectionState = "disconnected";
    this.activeBucketTs = null;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.connection) {
      try {
        if (this.connection.state === signalR.HubConnectionState.Connected) {
          await this.connection.invoke("Unsubscribe", [this.symbol]);
        }
        await this.connection.stop();
      } catch (err) {
        console.warn("[BiquoteSocketProvider] Error during stop:", err);
      } finally {
        this.connection = null;
      }
    }

    this.notifyStatus();
  }

  public async refreshNow(): Promise<void> {
    if (!this.isActive) return;
    // Catch-up fetch latest bars without clearing store
    await this.catchUpHistory(15);
  }

  public subscribeStatus(cb: (status: SocketProviderStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.getStatus());
    return () => this.statusListeners.delete(cb);
  }

  public getStatus(): SocketProviderStatus {
    return {
      state: this.connectionState,
      lastTickIso: this.lastTickIso,
      lastPrice: this.lastPrice,
      tickCount: this.tickCount,
      error: this.lastError,
      candleCount: this.store.getAll().length,
      timeframe: this.timeframe,
    };
  }

  /**
   * Initialize SignalR Hub connection with auto-reconnect
   */
  private async initSocketConnection(): Promise<void> {
    if (!this.isActive) return;

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl("https://biquote.io/hubs/tick", {
          withCredentials: false,
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
        })
        .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      // Listen for incoming live market ticks
      this.connection.on("ReceiveTick", (tick: BiquoteTick) => {
        this.handleIncomingTick(tick);
      });

      // SignalR Reconnecting handler
      this.connection.onreconnecting((err) => {
        this.connectionState = "reconnecting";
        this.lastError = err?.message || "Reconnecting to live socket feed...";
        this.notifyStatus();
      });

      // SignalR Reconnected handler
      this.connection.onreconnected(async () => {
        this.connectionState = "connected";
        this.lastError = null;
        this.notifyStatus();

        if (this.connection && this.isActive) {
          try {
            await this.connection.invoke("Subscribe", [this.symbol]);
            // Catch-up latest bars after reconnection
            await this.catchUpHistory(15);
          } catch (err: any) {
            console.warn("[BiquoteSocketProvider] Re-subscribe failed:", err);
          }
        }
      });

      // SignalR Closed handler
      this.connection.onclose((err) => {
        if (this.isActive) {
          this.connectionState = "disconnected";
          if (err) {
            this.lastError = err.message || "Socket connection closed unexpectedly";
          }
          this.notifyStatus();
        }
      });

      await this.connection.start();
      this.connectionState = "connected";
      this.lastError = null;
      this.notifyStatus();

      // Subscribe to symbol
      await this.connection.invoke("Subscribe", [this.symbol]);
    } catch (err: any) {
      if (!this.isActive) return;
      this.connectionState = "error";
      this.lastError = err?.message || "Failed to establish socket connection to Biquote";
      this.notifyStatus();
    }
  }

  /**
   * Process incoming real-time market tick from Biquote SignalR stream
   */
  private handleIncomingTick(tick: BiquoteTick): void {
    if (!this.isActive || !tick || tick.symbol !== this.symbol) return;

    const price = typeof tick.bid === "number" && tick.bid > 0 ? tick.bid : tick.mid;
    if (price === undefined || price <= 0) return;

    const tickTimeMs = Date.parse(tick.timestamp);
    if (isNaN(tickTimeMs)) return;
    const tickTs = Math.floor(tickTimeMs / 1000);

    // Calculate duration in seconds for the selected timeframe
    const tfDef = TIMEFRAMES.find((t) => t.id === this.timeframe);
    const durationSec = (tfDef ? tfDef.minutes : 5) * 60;

    // Calculate UTC aligned bucket opening timestamp
    const bucketStartTs = Math.floor(tickTs / durationSec) * durationSec;

    // Update connection status to LIVE on receipt of verified tick
    this.connectionState = "live";
    this.lastTickIso = tick.timestamp;
    this.lastPrice = price;
    this.tickCount++;

    const allCandles = this.store.getAll();
    const existingLast = allCandles[allCandles.length - 1];

    if (existingLast && existingLast.timestamp === bucketStartTs) {
      // Existing active bucket: update high, low, close, and increment tick volume
      const updatedCandle: OHLCV = {
        ...existingLast,
        high: Math.max(existingLast.high, price),
        low: Math.min(existingLast.low, price),
        close: price,
        tickVolume: (existingLast.tickVolume || 0) + 1,
        isOpen: true,
      };
      this.store.merge([updatedCandle]);
    } else if (!existingLast || bucketStartTs > existingLast.timestamp) {
      // New timeframe period crossed: finalize previous candle as closed, open new active candle
      const toMerge: OHLCV[] = [];

      if (existingLast && existingLast.isOpen) {
        toMerge.push({
          ...existingLast,
          isOpen: false,
        });
      }

      toMerge.push({
        timestamp: bucketStartTs,
        isoTime: new Date(bucketStartTs * 1000).toISOString(),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        tickVolume: 1,
        isOpen: true,
      });

      this.store.merge(toMerge);
    }

    this.notifyStatus();
  }

  /**
   * Seed historical candles from Biquote REST endpoint
   */
  private async seedInitialHistory(limit: number = 1000): Promise<void> {
    const requestId = this.currentRequestId;
    this.abortController = new AbortController();

    try {
      let apiInterval: string = this.timeframe;
      let multiplier = 1;

      if (this.timeframe === "10m") {
        apiInterval = "5m";
        multiplier = 2;
      } else if (this.timeframe === "20m") {
        apiInterval = "5m";
        multiplier = 4;
      }

      const requestedLimit = Math.min(1000, Math.max(limit * multiplier + 10, 250));
      const url = `https://biquote.io/api/${this.symbol}/ohlc?interval=${apiInterval}&limit=${requestedLimit}`;

      const res = await fetch(url, {
        signal: this.abortController.signal,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`Biquote returned HTTP ${res.status}`);

      const data: BiquoteResponse = await res.json();
      if (!data || !Array.isArray(data.bars)) {
        throw new Error("Invalid response format from Biquote API");
      }

      const rawBars = [...data.bars].reverse();
      const normalized: OHLCV[] = rawBars.map((b: BiquoteRawBar) => {
        const ts = Math.floor(Date.parse(b.openTime) / 1000);
        return {
          timestamp: ts,
          isoTime: b.openTime,
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
          volume: Number(b.volume) || 0,
          tickVolume: Number(b.tickVolume) || 0,
          isOpen: b.isOpen,
        };
      });

      let finalCandles: OHLCV[] = normalized;
      if (this.timeframe === "10m") {
        finalCandles = aggregateCandles(normalized, 600);
      } else if (this.timeframe === "20m") {
        finalCandles = aggregateCandles(normalized, 1200);
      }

      if (requestId === this.currentRequestId) {
        this.store.set(finalCandles);
        this.notifyStatus();
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && requestId === this.currentRequestId) {
        console.warn("[BiquoteSocketProvider] Initial seed error:", err);
      }
    }
  }

  /**
   * Catch up latest bars without resetting store
   */
  private async catchUpHistory(limit: number = 15): Promise<void> {
    try {
      let apiInterval: string = this.timeframe;
      let multiplier = 1;
      if (this.timeframe === "10m") {
        apiInterval = "5m";
        multiplier = 2;
      } else if (this.timeframe === "20m") {
        apiInterval = "5m";
        multiplier = 4;
      }

      const url = `https://biquote.io/api/${this.symbol}/ohlc?interval=${apiInterval}&limit=${limit * multiplier + 5}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return;

      const data: BiquoteResponse = await res.json();
      if (!data || !Array.isArray(data.bars)) return;

      const rawBars = [...data.bars].reverse();
      const normalized: OHLCV[] = rawBars.map((b: BiquoteRawBar) => ({
        timestamp: Math.floor(Date.parse(b.openTime) / 1000),
        isoTime: b.openTime,
        open: Number(b.open),
        high: Number(b.high),
        low: Number(b.low),
        close: Number(b.close),
        volume: Number(b.volume) || 0,
        tickVolume: Number(b.tickVolume) || 0,
        isOpen: b.isOpen,
      }));

      let finalCandles: OHLCV[] = normalized;
      if (this.timeframe === "10m") {
        finalCandles = aggregateCandles(normalized, 600);
      } else if (this.timeframe === "20m") {
        finalCandles = aggregateCandles(normalized, 1200);
      }

      this.store.merge(finalCandles);
    } catch (err) {
      console.warn("[BiquoteSocketProvider] catchUpHistory error:", err);
    }
  }

  private notifyStatus(): void {
    const st = this.getStatus();
    this.statusListeners.forEach((l) => l(st));
  }
}
