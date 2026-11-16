import React, { useState, useEffect, useRef, useMemo } from "react";
import { AppLayout } from "../../components/layout/AppLayout";
import { SupportedTimeframe, OHLCV } from "../../services/patternEngine/types/candle";
import { DetectedPattern } from "../../services/patternEngine/types/pattern";
import { CandleStore } from "../../services/patternEngine/data/candleStore";
import { BiquoteDataProvider, ProviderStatus } from "../../services/patternEngine/data/biquoteProvider";
import { PatternEngine } from "../../services/patternEngine/engine/PatternEngine";
import { CandlestickChart } from "../../components/patterns/CandlestickChart";
import { PatternScannerSidebar } from "../../components/patterns/PatternScannerSidebar";
import { TimeframeSelector } from "../../components/patterns/TimeframeSelector";
import { AlertCircle, Sliders, LineChart } from "lucide-react";

export default function PatternScannerPage() {
  const [timeframe, setTimeframe] = useState<SupportedTimeframe>("5m");
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(10000);
  const [candles, setCandles] = useState<readonly OHLCV[]>([]);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [selectedPatternIds, setSelectedPatternIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<"chart" | "scanner">("chart");

  // Ref to always access the latest timeframe inside long-lived subscriptions without stale closure
  const timeframeRef = useRef<SupportedTimeframe>(timeframe);
  timeframeRef.current = timeframe;

  // Instances preserved across re-renders
  const storeRef = useRef<CandleStore>(new CandleStore("XAUUSD", timeframe));
  const engineRef = useRef<PatternEngine>(new PatternEngine());
  const providerRef = useRef<BiquoteDataProvider>(new BiquoteDataProvider(storeRef.current));

  const [providerStatus, setProviderStatus] = useState<ProviderStatus>(
    providerRef.current.getStatus()
  );

  // Lifecycle: Initialize store, engine, and polling data provider
  useEffect(() => {
    const store = storeRef.current;
    const engine = engineRef.current;
    const provider = providerRef.current;

    // Subscribe to store updates -> run detection engine scan using active timeframe
    const unsubscribeStore = store.subscribe((updatedCandles) => {
      setCandles([...updatedCandles]);
      const currentTf = timeframeRef.current;
      const result = engine.scan(updatedCandles, currentTf, "XAUUSD", true);
      setPatterns(result.patterns);
    });

    // Subscribe to provider status
    const unsubscribeStatus = provider.subscribeStatus((st) => {
      setProviderStatus(st);
    });

    // Start live REST polling
    provider.start();

    return () => {
      provider.stop();
      unsubscribeStore();
      unsubscribeStatus();
    };
  }, []);

  // Handle timeframe change
  const handleTimeframeChange = (newTf: SupportedTimeframe) => {
    if (newTf === timeframe) return;
    setTimeframe(newTf);
    setSelectedPatternIds([]); // Clear selection when changing timeframes
    providerRef.current.setTimeframe(newTf);
  };

  // Handle polling interval change
  const handlePollIntervalChange = (ms: number) => {
    setPollIntervalMs(ms);
    providerRef.current.setPollInterval(ms);
  };

  // Force manual refresh
  const handleRefresh = async () => {
    await providerRef.current.refreshNow();
  };

  // Pattern selection toggle (single-select by default to prevent overlap)
  const handleToggleSelectPattern = (id: string) => {
    if (isMultiSelect) {
      setSelectedPatternIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedPatternIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  const handleClearSelection = () => {
    setSelectedPatternIds([]);
  };

  // Resolve selected pattern objects to pass to chart overlay renderer
  const selectedPatterns = useMemo(() => {
    return patterns.filter((p) => selectedPatternIds.includes(p.id));
  }, [patterns, selectedPatternIds]);

  return (
    <AppLayout>
      {/* Full-height Trading Terminal Container */}
      <div className="flex-1 flex flex-col bg-[#070a12] text-slate-100 h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] min-h-0 overflow-hidden">
        {/* 1. Header Toolbar */}
        <TimeframeSelector
          activeTimeframe={timeframe}
          onChangeTimeframe={handleTimeframeChange}
          status={providerStatus}
          pollIntervalMs={pollIntervalMs}
          onChangePollInterval={handlePollIntervalChange}
          onRefresh={handleRefresh}
        />

        {/* API Error Notification Banner */}
        {providerStatus.error && (
          <div className="bg-rose-950/80 border-b border-rose-800 px-3 py-1 flex items-center justify-between text-xs text-rose-200 shrink-0">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={13} className="text-rose-400 shrink-0" />
              <span>{providerStatus.error}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="underline hover:text-white font-semibold cursor-pointer text-[11px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Mobile / Tablet Tab Switcher */}
        <div className="lg:hidden flex items-center bg-slate-950 border-b border-slate-800 px-3 py-1.5 justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMobileTab("chart")}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                mobileTab === "chart"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
              }`}
            >
              <LineChart size={13} />
              <span>Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("scanner")}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                mobileTab === "scanner"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
              }`}
            >
              <Sliders size={13} />
              <span>Scanner ({patterns.length})</span>
            </button>
          </div>

          {selectedPatternIds.length > 0 && (
            <span className="text-[10px] text-amber-400 font-mono font-semibold">
              1 Active Overlay
            </span>
          )}
        </div>

        {/* 2. Main Terminal Split View: Chart (75-80%) + Scanner (20-25%) */}
        <div className="flex-1 w-full flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Main Candlestick Chart Area */}
          <div
            className={`flex-1 flex flex-col min-h-0 min-w-0 p-2 lg:p-2.5 overflow-hidden ${
              mobileTab === "scanner" ? "hidden lg:flex" : "flex"
            }`}
          >
            <CandlestickChart
              candles={candles}
              selectedPatterns={selectedPatterns}
              timeframe={timeframe}
              symbol="XAUUSD"
              isLoading={providerStatus.isLoading}
              onRefresh={handleRefresh}
            />
          </div>

          {/* Right-Side Scanner Sidebar */}
          <div
            className={`flex-1 lg:flex-none w-full lg:w-80 xl:w-96 flex flex-col min-h-0 overflow-hidden ${
              mobileTab === "chart" ? "hidden lg:flex" : "flex"
            }`}
          >
            <PatternScannerSidebar
              patterns={patterns}
              selectedPatternIds={selectedPatternIds}
              onToggleSelectPattern={handleToggleSelectPattern}
              onClearSelection={handleClearSelection}
              isMultiSelect={isMultiSelect}
              onToggleMultiSelect={() => setIsMultiSelect((v) => !v)}
              symbol="XAU/USD"
              timeframe={timeframe}
              onViewOnChart={() => setMobileTab("chart")}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
