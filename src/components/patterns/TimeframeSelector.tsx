import React from "react";
import { SupportedTimeframe, TIMEFRAMES } from "../../services/patternEngine/types/candle";
import { ProviderStatus } from "../../services/patternEngine/data/biquoteProvider";
import { SocketProviderStatus } from "../../services/patternEngine/data/biquoteSocketProvider";
import { RefreshCw, Activity, Clock, Zap, Wifi, WifiOff } from "lucide-react";

interface TimeframeSelectorProps {
  activeTimeframe: SupportedTimeframe;
  onChangeTimeframe: (tf: SupportedTimeframe) => void;
  status: ProviderStatus;
  pollIntervalMs: number;
  onChangePollInterval: (ms: number) => void;
  onRefresh: () => void;
  dataSourceMode: "api" | "socket";
  onChangeDataSourceMode: (mode: "api" | "socket") => void;
  socketStatus: SocketProviderStatus;
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  activeTimeframe,
  onChangeTimeframe,
  status,
  pollIntervalMs,
  onChangePollInterval,
  onRefresh,
  dataSourceMode,
  onChangeDataSourceMode,
  socketStatus,
}) => {
  // Format last tick time in Asia/Kolkata (IST)
  const formatTimeIST = (isoString: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return null;
    }
  };

  const isSocketLive = dataSourceMode === "socket" && socketStatus.state === "live";

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 border-b border-slate-800 text-xs flex-wrap">
      {/* 1. Left Section: Mode Switcher + Timeframe Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {/* Data Source Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => onChangeDataSourceMode("api")}
            className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              dataSourceMode === "api"
                ? "bg-slate-800 text-amber-400 border border-slate-700 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="REST API Mode: Regular interval polling"
          >
            <Activity size={11} />
            <span>API</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeDataSourceMode("socket")}
            className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              dataSourceMode === "socket"
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Live Socket Mode: Real-time streaming via Biquote SignalR Hub"
          >
            <Zap size={11} className={isSocketLive ? "text-emerald-400" : ""} />
            <span>Live Socket</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 shrink-0 mx-0.5" />

        {/* Timeframe Buttons */}
        <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 hidden sm:inline">
          TF:
        </span>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.id}
            type="button"
            onClick={() => onChangeTimeframe(tf.id)}
            className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTimeframe === tf.id
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
            title={tf.isDerived ? `${tf.label} (Aggregate from 5m)` : `${tf.label} (Native Biquote)`}
          >
            {tf.label}
            {tf.isDerived && <span className="text-[9px] ml-0.5 opacity-60">*</span>}
          </button>
        ))}
      </div>

      {/* 2. Right Section: Live Status & Controls according to active mode */}
      <div className="flex items-center gap-1.5 shrink-0">
        {dataSourceMode === "api" ? (
          <>
            {/* API Mode Controls */}
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px] text-slate-300">
              <Clock size={11} className="text-slate-400" />
              <label htmlFor="poll-freq-select" className="sr-only">
                Poll Frequency
              </label>
              <select
                id="poll-freq-select"
                value={pollIntervalMs}
                onChange={(e) => onChangePollInterval(Number(e.target.value))}
                className="bg-transparent text-[11px] font-mono font-semibold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value={5000}>5s poll</option>
                <option value={10000}>10s poll</option>
                <option value={30000}>30s poll</option>
              </select>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/80 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  status.isPolling ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />
              <span className="text-slate-300 font-mono hidden md:inline">
                {status.candleCount} bars
              </span>
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={status.isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors font-semibold text-xs cursor-pointer disabled:opacity-50"
              title="Force refresh current candles from Biquote"
            >
              <RefreshCw size={12} className={status.isLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </>
        ) : (
          <>
            {/* Live Socket Mode Controls */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/80 text-[11px]">
              {/* Dynamic Connection Status Indicator */}
              {socketStatus.state === "live" && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-emerald-400 font-bold font-mono text-[10px] sm:text-xs">
                    LIVE
                  </span>
                  {socketStatus.lastPrice && (
                    <span className="text-slate-200 font-mono font-bold text-[11px]">
                      ${socketStatus.lastPrice.toFixed(2)}
                    </span>
                  )}
                  {socketStatus.lastTickIso && (
                    <span className="text-slate-400 font-mono text-[10px] hidden md:inline">
                      {formatTimeIST(socketStatus.lastTickIso)} IST
                    </span>
                  )}
                </div>
              )}

              {socketStatus.state === "connected" && (
                <div className="flex items-center gap-1 text-sky-400 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
                  <span>Subscribed</span>
                </div>
              )}

              {socketStatus.state === "connecting" && (
                <div className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span>Connecting...</span>
                </div>
              )}

              {socketStatus.state === "reconnecting" && (
                <div className="flex items-center gap-1 text-orange-400 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />
                  <span>Reconnecting...</span>
                </div>
              )}

              {(socketStatus.state === "disconnected" || socketStatus.state === "error") && (
                <div className="flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                  <WifiOff size={11} className="text-rose-400" />
                  <span>{socketStatus.state === "error" ? "Error" : "Disconnected"}</span>
                </div>
              )}
            </div>

            {/* Socket Reconnect / Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors font-semibold text-xs cursor-pointer"
              title="Catch-up recent ticks/bars"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Catch-up</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
