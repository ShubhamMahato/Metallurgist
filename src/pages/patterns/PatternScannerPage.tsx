import React, { useState, useEffect, useRef, useMemo } from "react";
import { AppLayout } from "../../components/layout/AppLayout";
import { SupportedTimeframe, OHLCV } from "../../services/patternEngine/types/candle";
import { DetectedPattern } from "../../services/patternEngine/types/pattern";
import { CandleStore } from "../../services/patternEngine/data/candleStore";
import { BiquoteDataProvider, ProviderStatus } from "../../services/patternEngine/data/biquoteProvider";
import { BiquoteSocketProvider, SocketProviderStatus } from "../../services/patternEngine/data/biquoteSocketProvider";
import { PatternEngine } from "../../services/patternEngine/engine/PatternEngine";
import { CandlestickChart } from "../../components/patterns/CandlestickChart";
import { PatternScannerSidebar } from "../../components/patterns/PatternScannerSidebar";
import { TimeframeSelector } from "../../components/patterns/TimeframeSelector";
import { AlertCircle, Sliders, LineChart } from "lucide-react";

export default function PatternScannerPage() {
  const [timeframe, setTimeframe] = useState<SupportedTimeframe>("5m");
  const [dataSourceMode, setDataSourceMode] = useState<"api" | "socket">("api");
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(10000);
  const [candles, setCandles] = useState<readonly OHLCV[]>([]);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [selectedPatternIds, setSelectedPatternIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<"chart" | "scanner">("chart");

  // Ref to always access the latest timeframe inside long-lived subscriptions without stale closure
  const timeframeRef = useRef<SupportedTimeframe>(timeframe);
  timeframeRef.current = timeframe;

  // Single shared normalized candle store & pattern engine
  const storeRef = useRef<CandleStore>(new CandleStore("XAUUSD", timeframe));
  const engineRef = useRef<PatternEngine>(new PatternEngine());

  // Independent data providers feeding the exact same store
  const restProviderRef = useRef<BiquoteDataProvider>(new BiquoteDataProvider(storeRef.current));
  const socketProviderRef = useRef<BiquoteSocketProvider>(new BiquoteSocketProvider(storeRef.current));

  const [providerStatus, setProviderStatus] = useState<ProviderStatus>(
    restProviderRef.current.getStatus()
  );
  const [socketStatus, setSocketStatus] = useState<SocketProviderStatus>(
    socketProviderRef.current.getStatus()
  );

  // Lifecycle: Subscribe store, engine, and active data providers
  useEffect(() => {
    const store = storeRef.current;
    const engine = engineRef.current;
    const restProvider = restProviderRef.current;
    const socketProvider = socketProviderRef.current;

    // Subscribe to store updates -> run pattern engine scan using active timeframe
    const unsubscribeStore = store.subscribe((updatedCandles) => {
      setCandles([...updatedCandles]);
      const currentTf = timeframeRef.current;
      const result = engine.scan(updatedCandles, currentTf, "XAUUSD", true);
      setPatterns(result.patterns);
    });

    // Subscribe to REST provider status
    const unsubscribeRestStatus = restProvider.subscribeStatus((st) => {
      setProviderStatus(st);
    });

    // Subscribe to Socket provider status
    const unsubscribeSocketStatus = socketProvider.subscribeStatus((st) => {
      setSocketStatus(st);
    });

    // Start initial default mode (REST API)
    restProvider.start();

    return () => {
      restProvider.stop();
      socketProvider.stop();
      unsubscribeStore();
      unsubscribeRestStatus();
      unsubscribeSocketStatus();
    };
  }, []);

  // Handle switching between REST API Mode and Live Socket Mode
  const handleDataSourceModeChange = async (newMode: "api" | "socket") => {
    if (newMode === dataSourceMode) return;
    setDataSourceMode(newMode);

    const currentTf = timeframeRef.current;

    if (newMode === "socket") {
      // 1. Immediately stop REST polling to prevent competing updates
      restProviderRef.current.stop();
      // 2. Start Live Socket provider
      socketProviderRef.current.setTimeframe(currentTf);
      await socketProviderRef.current.start();
    } else {
      // 1. Immediately stop Live Socket connection
      await socketProviderRef.current.stop();
      // 2. Start REST polling provider
      restProviderRef.current.setTimeframe(currentTf);
      restProviderRef.current.start();
    }
  };

  // Handle timeframe change (applies to active provider)
  const handleTimeframeChange = (newTf: SupportedTimeframe) => {
    if (newTf === timeframe) return;
    setTimeframe(newTf);
    setSelectedPatternIds([]); // Clear active overlays on timeframe switch

    if (dataSourceMode === "socket") {
      socketProviderRef.current.setTimeframe(newTf);
    } else {
      restProviderRef.current.setTimeframe(newTf);
    }
  };

  // Handle polling interval change (API mode only)
  const handlePollIntervalChange = (ms: number) => {
    setPollIntervalMs(ms);
    restProviderRef.current.setPollInterval(ms);
  };

  // Force manual refresh / catch-up
  const handleRefresh = async () => {
    if (dataSourceMode === "socket") {
      await socketProviderRef.current.refreshNow();
    } else {
      await restProviderRef.current.refreshNow();
    }
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

  // Active error message depending on mode
  const activeError = dataSourceMode === "socket" ? socketStatus.error : providerStatus.error;

  return (
    <AppLayout>
      {/* Full-height Trading Terminal Container */}
      <div className="flex-1 flex flex-col bg-[#070a12] text-slate-100 h-[calc(100dvh-3rem)] sm:h-[calc(100dvh-4rem)] max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)] min-h-0 overflow-hidden">
        {/* 1. Header Toolbar with Data Source Selector & Timeframes */}
        <TimeframeSelector
          activeTimeframe={timeframe}
          onChangeTimeframe={handleTimeframeChange}
          status={providerStatus}
          pollIntervalMs={pollIntervalMs}
          onChangePollInterval={handlePollIntervalChange}
          onRefresh={handleRefresh}
          dataSourceMode={dataSourceMode}
          onChangeDataSourceMode={handleDataSourceModeChange}
          socketStatus={socketStatus}
          mobileTab={mobileTab}
          onChangeMobileTab={setMobileTab}
          patternCount={patterns.length}
          activeOverlayCount={selectedPatternIds.length}
          symbol="XAU/USD"
        />

        {/* Error Notification Banner */}
        {activeError && (
          <div className="bg-rose-950/80 border-b border-rose-800 px-3 py-1 flex items-center justify-between text-xs text-rose-200 shrink-0">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={13} className="text-rose-400 shrink-0" />
              <span>{activeError}</span>
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
              isLoading={dataSourceMode === "api" ? providerStatus.isLoading : socketStatus.state === "connecting"}
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
