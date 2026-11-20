import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  UTCTimestamp,
  TickMarkType,
  Time,
  LineStyle,
} from "lightweight-charts";
import { OHLCV, TIMEFRAMES } from "../../services/patternEngine/types/candle";
import { DetectedPattern } from "../../services/patternEngine/types/pattern";
import {
  calculateEMA,
  calculateBollingerBands,
  calculateSupertrend,
  calculateVWAP,
  calculateRSI,
  calculateMACD,
} from "../../services/patternEngine/core/indicators";
import { PatternOverlayRenderer } from "./PatternOverlayRenderer";
import { IndicatorSubChart } from "./IndicatorSubChart";
import {
  Maximize2,
  RefreshCw,
  Clock,
  Globe,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BarChart2,
  Activity,
  ChevronDown,
  Check,
  X,
  Sparkles,
} from "lucide-react";

interface CandlestickChartProps {
  candles: readonly OHLCV[];
  selectedPatterns: DetectedPattern[];
  timeframe: string;
  symbol?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export type IndicatorId =
  | "ema9"
  | "ema21"
  | "ema50"
  | "ema200"
  | "bb"
  | "supertrend"
  | "vwap"
  | "macd"
  | "rsi";

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

  // Overlay Line Series Refs
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const supertrendSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredCandle, setHoveredCandle] = useState<OHLCV | null>(null);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [, setCoordinateVersion] = useState(0);

  // Technical Indicators state: default enabled with popular EMA 9/21 momentum and RSI
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(
    new Set<IndicatorId>(["ema9", "ema21", "rsi"])
  );
  const [isIndicatorMenuOpen, setIsIndicatorMenuOpen] = useState(false);
  const indicatorMenuRef = useRef<HTMLDivElement>(null);

  const toggleIndicator = useCallback((id: IndicatorId) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setPreset = useCallback((preset: "ribbon" | "trend" | "meanReversion" | "all" | "clear") => {
    if (preset === "ribbon") {
      setActiveIndicators(new Set(["ema9", "ema21", "ema50", "ema200", "rsi"]));
    } else if (preset === "trend") {
      setActiveIndicators(new Set(["ema21", "supertrend", "macd"]));
    } else if (preset === "meanReversion") {
      setActiveIndicators(new Set(["bb", "rsi"]));
    } else if (preset === "all") {
      setActiveIndicators(
        new Set(["ema9", "ema21", "ema50", "ema200", "bb", "supertrend", "vwap", "macd", "rsi"])
      );
    } else if (preset === "clear") {
      setActiveIndicators(new Set());
    }
  }, []);

  // Close indicator menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        indicatorMenuRef.current &&
        !indicatorMenuRef.current.contains(e.target as Node)
      ) {
        setIsIndicatorMenuOpen(false);
      }
    };
    if (isIndicatorMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isIndicatorMenuOpen]);

  // Standard normal view showing recent candles at a comfortable scale
  const zoomToGoodView = useCallback((totalCount: number) => {
    if (!chartRef.current || totalCount === 0) return;
    const timeScale = chartRef.current.timeScale();
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
        minBarSpacing: 0.5,
        maxBarSpacing: 32,
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

          return date.toLocaleTimeString("en-GB", {
            timeZone: "Asia/Kolkata",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
    });

    // Main Candlestick Series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#10b981",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Overlay Indicators: EMAs
    const ema9 = chart.addSeries(LineSeries, {
      color: "#38bdf8", // Sky blue
      lineWidth: 1.5,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    const ema21 = chart.addSeries(LineSeries, {
      color: "#fbbf24", // Amber
      lineWidth: 1.5,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    const ema50 = chart.addSeries(LineSeries, {
      color: "#a855f7", // Purple
      lineWidth: 1.5,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    const ema200 = chart.addSeries(LineSeries, {
      color: "#f43f5e", // Rose
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    // Overlay Indicators: Bollinger Bands
    const bbUpper = chart.addSeries(LineSeries, {
      color: "rgba(129, 140, 248, 0.75)",
      lineWidth: 1,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    const bbMiddle = chart.addSeries(LineSeries, {
      color: "rgba(99, 102, 241, 0.9)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    const bbLower = chart.addSeries(LineSeries, {
      color: "rgba(129, 140, 248, 0.75)",
      lineWidth: 1,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    // Overlay Indicators: Supertrend
    const supertrend = chart.addSeries(LineSeries, {
      color: "#10b981",
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    // Overlay Indicators: VWAP
    const vwap = chart.addSeries(LineSeries, {
      color: "#ec4899", // Pink
      lineWidth: 1.5,
      lineStyle: LineStyle.Dotted,
      visible: false,
      priceLineVisible: false,
      title: "",
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;

    ema9SeriesRef.current = ema9;
    ema21SeriesRef.current = ema21;
    ema50SeriesRef.current = ema50;
    ema200SeriesRef.current = ema200;
    bbUpperSeriesRef.current = bbUpper;
    bbMiddleSeriesRef.current = bbMiddle;
    bbLowerSeriesRef.current = bbLower;
    supertrendSeriesRef.current = supertrend;
    vwapSeriesRef.current = vwap;

    setDimensions({ width: initialWidth, height: initialHeight });

    const handleRangeChange = () => {
      setCoordinateVersion((v) => v + 1);
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const ts = Number(param.time);
        const match = candles.find((c) => c.timestamp === ts);
        setHoveredCandle(match || null);
      } else {
        setHoveredCandle(null);
      }
    });

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
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema200SeriesRef.current = null;
      bbUpperSeriesRef.current = null;
      bbMiddleSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
      supertrendSeriesRef.current = null;
      vwapSeriesRef.current = null;
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

  // Update and sync Overlay Indicators
  useEffect(() => {
    if (candles.length === 0) return;
    const closes = candles.map((c) => c.close);
    const n = candles.length;

    // 1. EMA 9
    const isEma9 = activeIndicators.has("ema9");
    if (ema9SeriesRef.current) {
      ema9SeriesRef.current.applyOptions({ visible: isEma9 });
      if (isEma9) {
        const ema9Vals = calculateEMA(closes, 9);
        const data = [];
        for (let i = 0; i < n; i++) {
          if (ema9Vals[i] !== null) {
            data.push({ time: candles[i].timestamp as UTCTimestamp, value: ema9Vals[i]! });
          }
        }
        ema9SeriesRef.current.setData(data);
      }
    }

    // 2. EMA 21
    const isEma21 = activeIndicators.has("ema21");
    if (ema21SeriesRef.current) {
      ema21SeriesRef.current.applyOptions({ visible: isEma21 });
      if (isEma21) {
        const ema21Vals = calculateEMA(closes, 21);
        const data = [];
        for (let i = 0; i < n; i++) {
          if (ema21Vals[i] !== null) {
            data.push({ time: candles[i].timestamp as UTCTimestamp, value: ema21Vals[i]! });
          }
        }
        ema21SeriesRef.current.setData(data);
      }
    }

    // 3. EMA 50
    const isEma50 = activeIndicators.has("ema50");
    if (ema50SeriesRef.current) {
      ema50SeriesRef.current.applyOptions({ visible: isEma50 });
      if (isEma50) {
        const ema50Vals = calculateEMA(closes, 50);
        const data = [];
        for (let i = 0; i < n; i++) {
          if (ema50Vals[i] !== null) {
            data.push({ time: candles[i].timestamp as UTCTimestamp, value: ema50Vals[i]! });
          }
        }
        ema50SeriesRef.current.setData(data);
      }
    }

    // 4. EMA 200
    const isEma200 = activeIndicators.has("ema200");
    if (ema200SeriesRef.current) {
      ema200SeriesRef.current.applyOptions({ visible: isEma200 });
      if (isEma200) {
        const ema200Vals = calculateEMA(closes, Math.min(200, n));
        const data = [];
        for (let i = 0; i < n; i++) {
          if (ema200Vals[i] !== null) {
            data.push({ time: candles[i].timestamp as UTCTimestamp, value: ema200Vals[i]! });
          }
        }
        ema200SeriesRef.current.setData(data);
      }
    }

    // 5. Bollinger Bands
    const isBB = activeIndicators.has("bb");
    if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
      bbUpperSeriesRef.current.applyOptions({ visible: isBB });
      bbMiddleSeriesRef.current.applyOptions({ visible: isBB });
      bbLowerSeriesRef.current.applyOptions({ visible: isBB });

      if (isBB) {
        const bb = calculateBollingerBands(candles as OHLCV[], 20, 2);
        const uData = [];
        const mData = [];
        const lData = [];
        for (let i = 0; i < n; i++) {
          const t = candles[i].timestamp as UTCTimestamp;
          if (bb.upper[i] !== null) uData.push({ time: t, value: bb.upper[i]! });
          if (bb.middle[i] !== null) mData.push({ time: t, value: bb.middle[i]! });
          if (bb.lower[i] !== null) lData.push({ time: t, value: bb.lower[i]! });
        }
        bbUpperSeriesRef.current.setData(uData);
        bbMiddleSeriesRef.current.setData(mData);
        bbLowerSeriesRef.current.setData(lData);
      }
    }

    // 6. Supertrend
    const isSupertrend = activeIndicators.has("supertrend");
    if (supertrendSeriesRef.current) {
      supertrendSeriesRef.current.applyOptions({ visible: isSupertrend });
      if (isSupertrend) {
        const st = calculateSupertrend(candles as OHLCV[], 10, 3);
        const data = [];
        const latestTrend = st.trend[n - 1] ?? "BULLISH";
        supertrendSeriesRef.current.applyOptions({
          color: latestTrend === "BULLISH" ? "#10b981" : "#ef4444",
        });

        for (let i = 0; i < n; i++) {
          const val = st.supertrend[i];
          if (val !== null) {
            data.push({ time: candles[i].timestamp as UTCTimestamp, value: val });
          }
        }
        supertrendSeriesRef.current.setData(data);
      }
    }

    // 7. VWAP
    const isVwap = activeIndicators.has("vwap");
    if (vwapSeriesRef.current) {
      vwapSeriesRef.current.applyOptions({ visible: isVwap });
      if (isVwap) {
        const vwapVals = calculateVWAP(candles as OHLCV[]);
        const data = [];
        for (let i = 0; i < n; i++) {
          if (vwapVals[i] !== null) {
            data.push({ time: candles[i].timestamp as UTCTimestamp, value: vwapVals[i]! });
          }
        }
        vwapSeriesRef.current.setData(data);
      }
    }
  }, [candles, activeIndicators]);

  // Toggle volume visibility
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume });
    }
  }, [showVolume]);

  // Coordinate converter function for SVG overlay
  const timeToX = useCallback(
    (time: number): number | null => {
      if (!chartRef.current || candles.length === 0) return null;
      try {
        const timeScale = chartRef.current.timeScale();
        const direct = timeScale.timeToCoordinate(time as UTCTimestamp);
        if (direct !== null) return direct;

        const lastCandle = candles[candles.length - 1];
        if (time > lastCandle.timestamp) {
          const lastX = timeScale.timeToCoordinate(lastCandle.timestamp as UTCTimestamp);
          if (lastX === null) return null;

          const tfDef = TIMEFRAMES.find((t) => t.id === timeframe);
          const stepSec = (tfDef ? tfDef.minutes : 5) * 60;
          const barsAhead = (time - lastCandle.timestamp) / stepSec;

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

  const handleFitContent = () => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().fitContent();
  };

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

  const activeCandle = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);
  const priceChange = activeCandle ? activeCandle.close - activeCandle.open : 0;
  const priceChangePct = activeCandle && activeCandle.open > 0 ? (priceChange / activeCandle.open) * 100 : 0;
  const isUp = priceChange >= 0;

  // Latest indicator stats calculated for top indicator bar
  const latestStats = useMemo(() => {
    if (candles.length === 0) return null;
    const closes = candles.map((c) => c.close);
    const n = candles.length;

    const e9 = activeIndicators.has("ema9") ? calculateEMA(closes, 9)[n - 1] : null;
    const e21 = activeIndicators.has("ema21") ? calculateEMA(closes, 21)[n - 1] : null;
    const e50 = activeIndicators.has("ema50") ? calculateEMA(closes, 50)[n - 1] : null;
    const e200 = activeIndicators.has("ema200") ? calculateEMA(closes, Math.min(200, n))[n - 1] : null;

    let bbUpperVal: number | null = null;
    let bbLowerVal: number | null = null;
    if (activeIndicators.has("bb")) {
      const bb = calculateBollingerBands(candles as OHLCV[], 20, 2);
      bbUpperVal = bb.upper[n - 1];
      bbLowerVal = bb.lower[n - 1];
    }

    let stVal: number | null = null;
    let stTrend: "BULLISH" | "BEARISH" | null = null;
    if (activeIndicators.has("supertrend")) {
      const st = calculateSupertrend(candles as OHLCV[], 10, 3);
      stVal = st.supertrend[n - 1];
      stTrend = st.trend[n - 1];
    }

    const vwapVal = activeIndicators.has("vwap") ? calculateVWAP(candles as OHLCV[])[n - 1] : null;

    return { e9, e21, e50, e200, bbUpperVal, bbLowerVal, stVal, stTrend, vwapVal };
  }, [candles, activeIndicators]);

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
      {/* 1. Top Chart Header / Bar Stats */}
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

          {/* Indicators & Strategies Dropdown Trigger */}
          <div className="relative" ref={indicatorMenuRef}>
            <button
              type="button"
              onClick={() => setIsIndicatorMenuOpen((prev) => !prev)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeIndicators.size > 0
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                  : "hover:text-amber-400 hover:bg-slate-800 text-slate-400 border border-slate-700/60"
              }`}
              title="Add Technical Indicators & Strategies"
            >
              <Activity size={13} className="text-amber-400" />
              <span className="font-semibold">Indicators</span>
              {activeIndicators.size > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 font-mono text-[9px] flex items-center justify-center font-bold">
                  {activeIndicators.size}
                </span>
              )}
              <ChevronDown size={11} className={`transition-transform duration-200 ${isIndicatorMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Indicators Modal / Dropdown Menu */}
            {isIndicatorMenuOpen && (
              <>
                {/* Mobile backdrop overlay to prevent touch scrolling behind and close on tap */}
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden"
                  onClick={() => setIsIndicatorMenuOpen(false)}
                />

                <div className="fixed inset-x-3 top-1/2 -translate-y-1/2 max-w-sm mx-auto max-h-[82vh] overflow-y-auto z-50 sm:translate-y-0 sm:inset-x-auto sm:left-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-72 sm:max-h-[85vh] sm:mx-0 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2.5 text-slate-200 animate-in fade-in zoom-in-95 duration-150 custom-scrollbar">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                      <Sparkles size={13} />
                      <span>Strategies & Indicators</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsIndicatorMenuOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="py-2 border-b border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Trading Presets
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setPreset("ribbon")}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer transition-colors border border-sky-500/30"
                      >
                        EMA Ribbon
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreset("trend")}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 cursor-pointer transition-colors border border-emerald-500/30"
                      >
                        Supertrend + MACD
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreset("meanReversion")}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-purple-300 cursor-pointer transition-colors border border-purple-500/30"
                      >
                        Bollinger + RSI
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreset("clear")}
                        className="px-2 py-0.5 rounded text-[10px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 cursor-pointer transition-colors border border-rose-800/40"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Overlays List */}
                  <div className="py-2 border-b border-slate-800 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Chart Overlays
                    </div>
                    {[
                      { id: "ema9" as IndicatorId, label: "EMA 9 (Fast Momentum)", color: "#38bdf8" },
                      { id: "ema21" as IndicatorId, label: "EMA 21 (Dynamic Support)", color: "#fbbf24" },
                      { id: "ema50" as IndicatorId, label: "EMA 50 (Intermediate Trend)", color: "#a855f7" },
                      { id: "ema200" as IndicatorId, label: "EMA 200 (Macro Bull/Bear)", color: "#f43f5e" },
                      { id: "bb" as IndicatorId, label: "Bollinger Bands (20, 2)", color: "#818cf8" },
                      { id: "supertrend" as IndicatorId, label: "Supertrend (10, 3 ATR)", color: "#10b981" },
                      { id: "vwap" as IndicatorId, label: "VWAP (Volume-Weighted)", color: "#ec4899" },
                    ].map((ind) => {
                      const isChecked = activeIndicators.has(ind.id);
                      return (
                        <div
                          key={ind.id}
                          onClick={() => toggleIndicator(ind.id)}
                          className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                            isChecked ? "bg-slate-800/80 text-slate-100" : "hover:bg-slate-800/50 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: ind.color }}
                            />
                            <span>{ind.label}</span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              isChecked
                                ? "bg-amber-500 border-amber-500 text-slate-950 font-bold"
                                : "border-slate-700 bg-slate-900"
                            }`}
                          >
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sub-panes */}
                  <div className="pt-2 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Oscillators (Sub-Panes)
                    </div>
                    {[
                      { id: "rsi" as IndicatorId, label: "RSI (14 Overbought/Oversold)", color: "#c084fc" },
                      { id: "macd" as IndicatorId, label: "MACD (12, 26, 9 Momentum)", color: "#38bdf8" },
                    ].map((ind) => {
                      const isChecked = activeIndicators.has(ind.id);
                      return (
                        <div
                          key={ind.id}
                          onClick={() => toggleIndicator(ind.id)}
                          className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                            isChecked ? "bg-slate-800/80 text-slate-100" : "hover:bg-slate-800/50 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: ind.color }}
                            />
                            <span>{ind.label}</span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              isChecked
                                ? "bg-amber-500 border-amber-500 text-slate-950 font-bold"
                                : "border-slate-700 bg-slate-900"
                            }`}
                          >
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
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

          {/* Fit Full Chart */}
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

      {/* 2. Active Indicator Value Chips (TradingView Style Legend) */}
      {latestStats && activeIndicators.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-1 bg-slate-950/60 border-b border-slate-800/40 text-[10px] font-mono overflow-x-auto no-scrollbar shrink-0">
          {latestStats.e9 !== null && latestStats.e9 !== undefined && (
            <div className="flex items-center gap-1 text-sky-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>EMA 9:</span>
              <strong className="text-slate-200">{latestStats.e9.toFixed(2)}</strong>
            </div>
          )}
          {latestStats.e21 !== null && latestStats.e21 !== undefined && (
            <div className="flex items-center gap-1 text-amber-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>EMA 21:</span>
              <strong className="text-slate-200">{latestStats.e21.toFixed(2)}</strong>
            </div>
          )}
          {latestStats.e50 !== null && latestStats.e50 !== undefined && (
            <div className="flex items-center gap-1 text-purple-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>EMA 50:</span>
              <strong className="text-slate-200">{latestStats.e50.toFixed(2)}</strong>
            </div>
          )}
          {latestStats.e200 !== null && latestStats.e200 !== undefined && (
            <div className="flex items-center gap-1 text-rose-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>EMA 200:</span>
              <strong className="text-slate-200">{latestStats.e200.toFixed(2)}</strong>
            </div>
          )}
          {latestStats.bbUpperVal !== null && latestStats.bbLowerVal !== null && (
            <div className="flex items-center gap-1 text-indigo-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>BB:</span>
              <strong className="text-slate-200">
                [{latestStats.bbLowerVal.toFixed(1)} - {latestStats.bbUpperVal.toFixed(1)}]
              </strong>
            </div>
          )}
          {latestStats.stVal !== null && latestStats.stVal !== undefined && (
            <div
              className={`flex items-center gap-1 shrink-0 ${
                latestStats.stTrend === "BULLISH" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  latestStats.stTrend === "BULLISH" ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span>ST (10, 3):</span>
              <strong className="text-slate-200">{latestStats.stVal.toFixed(2)}</strong>
              <span className="text-[9px] uppercase font-bold">({latestStats.stTrend})</span>
            </div>
          )}
          {latestStats.vwapVal !== null && latestStats.vwapVal !== undefined && (
            <div className="flex items-center gap-1 text-pink-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              <span>VWAP:</span>
              <strong className="text-slate-200">{latestStats.vwapVal.toFixed(2)}</strong>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Candlestick Chart Canvas & Vector Overlay Layer */}
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

      {/* 4. Synchronized MACD Sub-Pane */}
      {activeIndicators.has("macd") && (
        <IndicatorSubChart
          candles={candles}
          type="MACD"
          onClose={() => toggleIndicator("macd")}
          mainChartApi={chartRef.current}
        />
      )}

      {/* 5. Synchronized RSI Sub-Pane */}
      {activeIndicators.has("rsi") && (
        <IndicatorSubChart
          candles={candles}
          type="RSI"
          onClose={() => toggleIndicator("rsi")}
          mainChartApi={chartRef.current}
        />
      )}
    </div>
  );
};
