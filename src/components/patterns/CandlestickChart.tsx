import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  UTCTimestamp,
  TickMarkType,
  Time,
} from "lightweight-charts";
import { OHLCV, TIMEFRAMES } from "../../services/patternEngine/types/candle";
import { DetectedPattern } from "../../services/patternEngine/types/pattern";
import { PatternOverlayRenderer } from "./PatternOverlayRenderer";
import { Maximize2, RefreshCw, Clock, Globe, ZoomIn, ZoomOut, RotateCcw, BarChart2 } from "lucide-react";

interface CandlestickChartProps {
  candles: readonly OHLCV[];
  selectedPatterns: DetectedPattern[];
  timeframe: string;
  symbol?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  selectedPatterns,
  timeframe,
  symbol = "XAUUSD",
  isLoading = false,
  onRefresh,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredCandle, setHoveredCandle] = useState<OHLCV | null>(null);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [, setCoordinateVersion] = useState(0);

  // Timezone information: Display strictly in Asia/Kolkata (IST)
  const tzInfo = useMemo(() => {
    return {
      name: "Asia/Kolkata",
      shortName: "IST",
      offsetStr: "UTC+05:30",
    };
  }, []);

  // Standard normal view showing recent candles at a comfortable scale
  const zoomToGoodView = useCallback((totalCount: number) => {
    if (!chartRef.current || totalCount === 0) return;
    const timeScale = chartRef.current.timeScale();
    // Maintain a consistent, natural trading view showing the most recent ~65-70 candles
    const visibleBars = Math.min(Math.max(totalCount, 30), 70);
    const rightOffset = 10;
    timeScale.setVisibleLogicalRange({
      from: totalCount - visibleBars,
      to: totalCount - 1 + rightOffset,
    });
  }, []);

  // Initialize and attach Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const chart = createChart(container, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#090d16" },
        textColor: "#94a3b8",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace, -apple-system",
      },
      grid: {
        vertLines: { color: "#1e293b", style: 1 },
        horzLines: { color: "#1e293b", style: 1 },
      },
      crosshair: {
        vertLine: { color: "#f59e0b", width: 1, style: 2, labelBackgroundColor: "#78350f" },
        horzLine: { color: "#f59e0b", width: 1, style: 2, labelBackgroundColor: "#78350f" },
      },
      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: { top: 0.1, bottom: 0.12 },
        autoScale: true,
      },
      localization: {
        timeFormatter: (time: number) => {
          const d = new Date(time * 1000);
          return d.toLocaleString("en-GB", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        },
      },
      timeScale: {
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        borderColor: "#334155",
        rightOffset: 10,
        barSpacing: 12,
        minBarSpacing: 0.5, // Allows zooming all the way out to see the full historical dataset
        maxBarSpacing: 32,  // Prevents giant distorted candles if zoomed in
        tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) => {
          let ts: number;
          if (typeof time === "number") {
            ts = time;
          } else if (typeof time === "string") {
            ts = Math.floor(new Date(time).getTime() / 1000);
          } else if (time && typeof time === "object" && "year" in time) {
            ts = Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000);
          } else {
            return null;
          }

          const date = new Date(ts * 1000);

          if (tickMarkType === TickMarkType.Year) {
            return date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", year: "numeric" });
          }
          if (tickMarkType === TickMarkType.Month) {
            return date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", month: "short" });
          }
          if (tickMarkType === TickMarkType.DayOfMonth) {
            const day = date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric" });
            const month = date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", month: "short" });
            return `${day} ${month}`;
          }

          // TickMarkType.Time (3) or TimeWithSeconds (4): local time in Asia/Kolkata (IST)
          return date.toLocaleTimeString("en-GB", {
            timeZone: "Asia/Kolkata",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#10b981",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // Overlay on main chart pane
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Volume bars occupy bottom 20%
        bottom: 0,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;
    setDimensions({ width: initialWidth, height: initialHeight });

    // Force coordinate re-calculation on chart scroll/zoom
    const handleRangeChange = () => {
      setCoordinateVersion((v) => v + 1);
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    // Crosshair hover listener
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const ts = Number(param.time);
        const match = candles.find((c) => c.timestamp === ts);
        setHoveredCandle(match || null);
      } else {
        setHoveredCandle(null);
      }
    });

    // ResizeObserver: auto-adjust chart canvas to container bounds
    let hasFittedInitial = false;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
        setDimensions({ width, height });
        setCoordinateVersion((v) => v + 1);
        if (!hasFittedInitial && candles.length > 0) {
          hasFittedInitial = true;
          zoomToGoodView(candles.length);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update candle data in chart series
  const lastTfRef = useRef<string>("");
  const lastCandleCountRef = useRef<number>(0);
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const chartData = candles.map((c) => ({
      time: c.timestamp as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(chartData);

    if (volumeSeriesRef.current) {
      const volumeData = candles.map((c) => {
        const vol = (c.volume && c.volume > 0) ? c.volume : (c.tickVolume || 0);
        return {
          time: c.timestamp as UTCTimestamp,
          value: vol,
          color: c.close >= c.open ? "rgba(16, 185, 129, 0.45)" : "rgba(244, 63, 94, 0.45)",
        };
      });
      volumeSeriesRef.current.setData(volumeData);
    }

    // Set normal balanced view whenever timeframe changes or when full dataset arrives
    const tfChanged = lastTfRef.current !== timeframe;
    const historyArrived = tfChanged || (lastCandleCountRef.current < 20 && chartData.length >= 20);

    if (historyArrived) {
      lastTfRef.current = timeframe;
      lastCandleCountRef.current = chartData.length;
      requestAnimationFrame(() => {
        zoomToGoodView(chartData.length);
      });
    }

    setCoordinateVersion((v) => v + 1);
  }, [candles, timeframe, zoomToGoodView]);

  // Toggle volume visibility
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume });
    }
  }, [showVolume]);

  // Coordinate converter function for SVG overlay (supports historical and future timestamps)
  const timeToX = useCallback(
    (time: number): number | null => {
      if (!chartRef.current || candles.length === 0) return null;
      try {
        const timeScale = chartRef.current.timeScale();
        const direct = timeScale.timeToCoordinate(time as UTCTimestamp);
        if (direct !== null) return direct;

        // If future timestamp beyond the latest candle: project into the right-side whitespace
        const lastCandle = candles[candles.length - 1];
        if (time > lastCandle.timestamp) {
          const lastX = timeScale.timeToCoordinate(lastCandle.timestamp as UTCTimestamp);
          if (lastX === null) return null;

          const tfDef = TIMEFRAMES.find((t) => t.id === timeframe);
          const stepSec = (tfDef ? tfDef.minutes : 5) * 60;
          const barsAhead = (time - lastCandle.timestamp) / stepSec;

          // Compute pixel width of 1 candle based on latest candles
          let barSpacing = 14;
          if (candles.length > 1) {
            const prevCandle = candles[candles.length - 2];
            const prevX = timeScale.timeToCoordinate(prevCandle.timestamp as UTCTimestamp);
            if (prevX !== null && lastX > prevX) {
              const diffBars = Math.max(1, (lastCandle.timestamp - prevCandle.timestamp) / stepSec);
              barSpacing = (lastX - prevX) / diffBars;
            }
          }
          return lastX + barsAhead * barSpacing;
        }
        return null;
      } catch {
        return null;
      }
    },
    [candles, timeframe]
  );

  const priceToY = useCallback(
    (price: number): number | null => {
      if (!seriesRef.current) return null;
      try {
        const coord = seriesRef.current.priceToCoordinate(price);
        return coord !== null ? coord : null;
      } catch {
        return null;
      }
    },
    [seriesRef]
  );

  // Fit the FULL historical chart (from very first candle to latest)
  const handleFitContent = () => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().fitContent();
  };

  // Reset to recent ~55 candles view
  const handleResetZoom = () => {
    zoomToGoodView(candles.length);
  };

  const handleZoomIn = () => {
    if (!chartRef.current) return;
    const ts = chartRef.current.timeScale();
    const currentRange = ts.getVisibleLogicalRange();
    if (currentRange) {
      const span = currentRange.to - currentRange.from;
      const newSpan = Math.max(10, Math.round(span * 0.7));
      ts.setVisibleLogicalRange({
        from: currentRange.to - newSpan,
        to: currentRange.to,
      });
    }
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    const ts = chartRef.current.timeScale();
    const currentRange = ts.getVisibleLogicalRange();
    if (currentRange) {
      const span = currentRange.to - currentRange.from;
      const newSpan = Math.min(candles.length + 5, Math.round(span * 1.5));
      ts.setVisibleLogicalRange({
        from: Math.max(0, currentRange.to - newSpan),
        to: currentRange.to,
      });
    }
  };

  // Active or hovered candle metrics
  const activeCandle = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);
  const priceChange = activeCandle ? activeCandle.close - activeCandle.open : 0;
  const priceChangePct = activeCandle && activeCandle.open > 0 ? (priceChange / activeCandle.open) * 100 : 0;
  const isUp = priceChange >= 0;

  const formatCandleInterval = (c: OHLCV, tf: string) => {
    const normTf = (tf || "").toLowerCase();
    let durationSec = 300;
    if (normTf === "1m") durationSec = 60;
    else if (normTf === "5m") durationSec = 300;
    else if (normTf === "10m") durationSec = 600;
    else if (normTf === "15m") durationSec = 900;
    else if (normTf === "20m") durationSec = 1200;
    else if (normTf === "30m") durationSec = 1800;
    else if (normTf === "1h") durationSec = 3600;
    else if (normTf === "4h") durationSec = 14400;
    else if (normTf === "1d") durationSec = 86400;

    const dStart = new Date(c.timestamp * 1000);
    const dEnd = new Date((c.timestamp + durationSec) * 1000);

    const startHhMm = dStart.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
    const endHhMm = dEnd.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
    const startDay = dStart.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
    const endDay = dEnd.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

    if (normTf === "1d") {
      return `${startDay} (Full Day)`;
    }

    if (startDay !== endDay) {
      return `${startDay} ${startHhMm} → ${endDay} ${endHhMm}`;
    }

    return `${startDay} ${startHhMm} → ${endHhMm}`;
  };

  return (
    <div className="relative flex-1 flex flex-col w-full min-h-0 bg-[#090d16] rounded-xl overflow-hidden border border-slate-800 shadow-xl select-none">
      {/* Top Chart Header / Bar Stats */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 text-xs z-20 gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold font-mono text-slate-100">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="tracking-wide">GOLD (XAU/USD)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-sans text-[10px] font-semibold">
              {timeframe}
            </span>
          </div>

          {activeCandle && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono text-[11px]"
              title={`Candle period: ${timeframe} (${activeCandle.isOpen ? "Forming" : "Closed"})`}
            >
              <Clock size={11} className="text-amber-400 shrink-0" />
              <span>{formatCandleInterval(activeCandle, timeframe)}</span>
              {activeCandle.isOpen && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="Live candle forming" />
              )}
            </div>
          )}

          {activeCandle && (
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span>O: <strong className="text-slate-200">{activeCandle.open.toFixed(2)}</strong></span>
              <span>H: <strong className="text-slate-200">{activeCandle.high.toFixed(2)}</strong></span>
              <span>L: <strong className="text-slate-200">{activeCandle.low.toFixed(2)}</strong></span>
              <span>C: <strong className={isUp ? "text-emerald-400" : "text-rose-400"}>{activeCandle.close.toFixed(2)}</strong></span>
              <span className={`font-semibold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                {isUp ? "+" : ""}{priceChange.toFixed(2)} ({isUp ? "+" : ""}{priceChangePct.toFixed(2)}%)
              </span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="hidden md:inline">
                Vol: <strong className="text-slate-200">{((activeCandle.volume && activeCandle.volume > 0) ? activeCandle.volume : (activeCandle.tickVolume || 0)).toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2 text-slate-400">
          {/* Timezone Badge */}
          <div
            className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono"
            title="Chart Timezone: Asia/Kolkata (IST)"
          >
            <Globe size={11} className="text-slate-500" />
            <span>IST (UTC+05:30)</span>
          </div>

          {/* Volume Series Toggle Button */}
          <button
            type="button"
            onClick={() => setShowVolume((prev) => !prev)}
            className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
              showVolume
                ? "text-amber-400 bg-amber-500/10 border border-amber-500/30"
                : "hover:text-amber-400 hover:bg-slate-800 text-slate-500 border border-transparent"
            }`}
            title={showVolume ? "Hide Volume Bars" : "Show Volume Bars"}
          >
            <BarChart2 size={13} />
            <span className="text-[10px] font-mono font-bold hidden xl:inline">VOL</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Candles"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            </button>
          )}

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Zoom In (Fewer bars, closer look)"
          >
            <ZoomIn size={13} />
          </button>

          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Zoom Out (More bars, broader time scale)"
          >
            <ZoomOut size={13} />
          </button>

          {/* Fit Full Chart (View entire history) */}
          <button
            type="button"
            onClick={handleFitContent}
            className="p-1.5 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Fit Full Chart (View all historical bars)"
          >
            <Maximize2 size={13} />
          </button>

          {/* Reset View */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Reset to Full Chart View"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Main Chart Canvas & Vector Overlay Layer */}
      <div
        ref={chartContainerRef}
        className="relative flex-1 w-full min-h-0 overflow-hidden"
      >
        {/* Selected Pattern Vector Overlays */}
        <PatternOverlayRenderer
          patterns={selectedPatterns}
          coordinateConverter={{ timeToX, priceToY }}
          width={dimensions.width}
          height={dimensions.height}
        />

        {/* Chart loading indicator */}
        {isLoading && (
          <div className="absolute top-3 right-3 z-30 bg-slate-900/80 backdrop-blur-xs border border-amber-500/40 px-2.5 py-1 rounded-md flex items-center gap-1.5 text-amber-400 text-xs font-mono">
            <RefreshCw size={11} className="animate-spin" />
            <span>Polling data...</span>
          </div>
        )}
      </div>
    </div>
  );
};
