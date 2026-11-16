import React from "react";
import { SupportedTimeframe, TIMEFRAMES } from "../../services/patternEngine/types/candle";
import { ProviderStatus } from "../../services/patternEngine/data/biquoteProvider";
import { RefreshCw, Activity, Clock } from "lucide-react";

interface TimeframeSelectorProps {
  activeTimeframe: SupportedTimeframe;
  onChangeTimeframe: (tf: SupportedTimeframe) => void;
  status: ProviderStatus;
  pollIntervalMs: number;
  onChangePollInterval: (ms: number) => void;
  onRefresh: () => void;
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  activeTimeframe,
  onChangeTimeframe,
  status,
  pollIntervalMs,
  onChangePollInterval,
  onRefresh,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-900 border-b border-slate-800 text-xs flex-wrap">
      {/* Timeframe Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
        <span className="text-[10px] uppercase font-bold text-slate-500 mr-1.5 hidden sm:inline">
          Timeframe:
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

      {/* Polling & Provider Status Controls */}
      <div className="flex items-center gap-2">
        {/* Polling frequency */}
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
            {status.candleCount} candles
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
      </div>
    </div>
  );
};
