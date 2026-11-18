import React from "react";
import { SupportedTimeframe, TIMEFRAMES } from "../../services/patternEngine/types/candle";
import { SocketProviderStatus } from "../../services/patternEngine/data/biquoteSocketProvider";
import { RefreshCw, WifiOff, LineChart, Sliders } from "lucide-react";

interface TimeframeSelectorProps {
  activeTimeframe: SupportedTimeframe;
  onChangeTimeframe: (tf: SupportedTimeframe) => void;
  onRefresh: () => void;
  socketStatus: SocketProviderStatus;
  mobileTab?: "chart" | "scanner";
  onChangeMobileTab?: (tab: "chart" | "scanner") => void;
  patternCount?: number;
  symbol?: string;
  activeOverlayCount?: number;
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  activeTimeframe,
  onChangeTimeframe,
  onRefresh,
  socketStatus,
  mobileTab = "chart",
  onChangeMobileTab,
  patternCount = 0,
  symbol = "XAU/USD",
  activeOverlayCount = 0,
}) => {
  // Format last update time in Asia/Kolkata (IST)
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

  const isConnected = socketStatus.state === "live" || socketStatus.state === "connected";
  const isLoading = socketStatus.state === "connecting";

  return (
    <div className="w-full bg-[#080d1a] border-b border-slate-800 text-xs shrink-0 select-none">
      {/* =========================================================================
          1. MOBILE TOP BAR (< lg)
          Row 1: Instrument & Price + View Toggle (Chart/Scan) + Refresh
         ========================================================================= */}
      <div className="lg:hidden flex items-center justify-between px-2.5 py-1.5 bg-[#0a101f] border-b border-slate-800/80 gap-2">
        {/* Left: Instrument & Price */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="font-mono font-bold text-amber-400 text-[11px] tracking-tight">
              {symbol}
            </span>
          </div>
          {socketStatus.lastPrice ? (
            <span className="font-mono font-bold text-emerald-400 text-xs truncate">
              ${socketStatus.lastPrice.toFixed(2)}
            </span>
          ) : (
            <span className="font-mono text-slate-400 text-[11px] truncate">
              Gold
            </span>
          )}
        </div>

        {/* Center: Mobile View Switcher (Chart vs Scanner) */}
        {onChangeMobileTab && (
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => onChangeMobileTab("chart")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                mobileTab === "chart"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LineChart size={12} />
              <span>Chart</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeMobileTab("scanner")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                mobileTab === "scanner"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders size={12} />
              <span>Scan</span>
              {patternCount > 0 && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                    mobileTab === "scanner"
                      ? "bg-slate-950 text-amber-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {patternCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Right: Quick Refresh */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-amber-400 border border-slate-700 cursor-pointer disabled:opacity-50 transition-colors active:scale-95"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE TIMEFRAME RIBBON (< lg)
          Row 2: Dedicated Horizontal Scrollable Timeframe Strip
         ========================================================================= */}
      <div className="lg:hidden flex items-center justify-between px-2 py-1 bg-[#070b14] border-b border-slate-800/80 overflow-hidden">
        {/* Scrollable Timeframe Buttons */}
        <div
          className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0 touch-pan-x overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
        >
          {TIMEFRAMES.map((tf) => {
            const isActive = activeTimeframe === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => onChangeTimeframe(tf.id)}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs ring-1 ring-amber-400"
                    : "bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 active:bg-slate-700"
                }`}
                title={tf.isDerived ? `${tf.label} (Aggregate from 5m)` : tf.label}
              >
                {tf.label}
                {tf.isDerived && <span className="text-[9px] ml-0.5 opacity-60 font-bold">*</span>}
              </button>
            );
          })}
        </div>

        {/* Status / Active Overlay Indicator at the end of the ribbon */}
        <div className="shrink-0 pl-1.5 flex items-center gap-1 text-[10px] font-mono border-l border-slate-800/80 ml-1">
          {activeOverlayCount > 0 ? (
            <span className="text-amber-400 font-bold whitespace-nowrap">
              {activeOverlayCount} Overlay
            </span>
          ) : isConnected ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          ) : socketStatus.state === "connecting" ? (
            <span className="text-amber-400 font-semibold flex items-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Connecting...
            </span>
          ) : socketStatus.state === "reconnecting" ? (
            <span className="text-orange-400 font-semibold flex items-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Reconnecting...
            </span>
          ) : (
            <span className="text-rose-400 font-semibold flex items-center gap-1 whitespace-nowrap">
              <WifiOff size={10} />
              Offline
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          3. DESKTOP SINGLE-ROW TERMINAL TOOLBAR (lg:flex)
         ========================================================================= */}
      <div className="hidden lg:flex items-center justify-between px-3 py-1.5 bg-[#0a101f] border-b border-slate-800 text-xs">
        {/* Left Section: Symbol + Status + Timeframe Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Symbol & Price Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="font-mono font-bold text-amber-400 text-xs">
                {symbol}
              </span>
            </div>
            {socketStatus.lastPrice && (
              <span className="font-mono font-bold text-emerald-400 text-xs">
                ${socketStatus.lastPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] shrink-0">
            {isConnected ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Connected</span>
                {socketStatus.lastTickIso && (
                  <span className="text-slate-400 font-mono text-[10px] ml-1">
                    {formatTimeIST(socketStatus.lastTickIso)} IST
                  </span>
                )}
              </div>
            ) : socketStatus.state === "connecting" ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>Connecting...</span>
              </div>
            ) : socketStatus.state === "reconnecting" ? (
              <div className="flex items-center gap-1.5 text-orange-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />
                <span>Reconnecting...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <WifiOff size={12} className="text-rose-400" />
                <span>Offline</span>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0 mx-1" />

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-0.5">
              TF:
            </span>
            {TIMEFRAMES.map((tf) => {
              const isActive = activeTimeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => onChangeTimeframe(tf.id)}
                  className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-bold shadow-sm ring-1 ring-amber-400"
                      : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  }`}
                  title={tf.isDerived ? `${tf.label} (Aggregate from 5m)` : tf.label}
                >
                  {tf.label}
                  {tf.isDerived && <span className="text-[9px] ml-0.5 opacity-60 font-bold">*</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section: Bar count & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Candle count badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span className="text-slate-300 font-mono">
              {socketStatus.candleCount} bars
            </span>
          </div>

          {/* Refresh / Catch-up button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors font-semibold text-xs cursor-pointer disabled:opacity-50"
            title="Refresh current candles"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeframeSelector;
