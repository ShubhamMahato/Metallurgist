import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeries,
  HistogramSeries,
  ColorType,
  UTCTimestamp,
  LineStyle,
  LogicalRange,
} from "lightweight-charts";
import { OHLCV } from "../../services/patternEngine/types/candle";
import { calculateMACD, calculateRSI } from "../../services/patternEngine/core/indicators";
import { X, TrendingUp, Activity } from "lucide-react";

interface IndicatorSubChartProps {
  candles: readonly OHLCV[];
  type: "MACD" | "RSI";
  onClose: () => void;
  mainChartApi: IChartApi | null;
}

export const IndicatorSubChart: React.FC<IndicatorSubChartProps> = ({
  candles,
  type,
  onClose,
  mainChartApi,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  // Series references
  const macdLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Latest values for header
  const [latestValues, setLatestValues] = useState<{
    val1?: number | null;
    val2?: number | null;
    val3?: number | null;
  }>({});

  const height = type === "MACD" ? 115 : 100;

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const initialWidth = container.clientWidth || 800;

    const chart = createChart(container, {
      width: initialWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: "#090d16" },
        textColor: "#64748b",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace, -apple-system",
      },
      grid: {
        vertLines: { color: "#131b2e", style: LineStyle.Dotted },
        horzLines: { color: "#131b2e", style: LineStyle.Dotted },
      },
      crosshair: {
        vertLine: { color: "#f59e0b", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#78350f" },
        horzLine: { color: "#f59e0b", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#78350f" },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true,
      },
      timeScale: {
        visible: false, // Time axis is already visible on the main chart
        borderVisible: false,
      },
    });

    chartRef.current = chart;

    if (type === "MACD") {
      const histSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
      const macdSeries = chart.addSeries(LineSeries, {
        color: "#38bdf8",
        lineWidth: 1.5,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
      const signalSeries = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 1.5,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });

      macdHistSeriesRef.current = histSeries;
      macdLineSeriesRef.current = macdSeries;
      macdSignalSeriesRef.current = signalSeries;

      // Add zero price line
      macdSeries.createPriceLine({
        price: 0,
        color: "#334155",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
      });
    } else {
      const rsiSeries = chart.addSeries(LineSeries, {
        color: "#c084fc",
        lineWidth: 1.5,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      });

      rsiSeries.createPriceLine({
        price: 70,
        color: "#f43f5e",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: "70",
      });
      rsiSeries.createPriceLine({
        price: 50,
        color: "#334155",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: "#10b981",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: "30",
      });

      rsiSeriesRef.current = rsiSeries;
    }

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(container);

    // Initial sync with main chart if available
    if (mainChartApi) {
      const range = mainChartApi.timeScale().getVisibleLogicalRange();
      if (range) {
        chart.timeScale().setVisibleLogicalRange(range);
      }
    }

    // Bidirectional sync handler
    const handleSubRangeChange = (range: LogicalRange | null) => {
      if (isSyncingRef.current || !mainChartApi || !range) return;
      isSyncingRef.current = true;
      try {
        mainChartApi.timeScale().setVisibleLogicalRange(range);
      } finally {
        isSyncingRef.current = false;
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleSubRangeChange);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      macdLineSeriesRef.current = null;
      macdSignalSeriesRef.current = null;
      macdHistSeriesRef.current = null;
      rsiSeriesRef.current = null;
    };
  }, [type, height]);

  // Sync from main chart to this sub-chart
  useEffect(() => {
    if (!mainChartApi || !chartRef.current) return;
    const subChart = chartRef.current;

    const handleMainRangeChange = (range: LogicalRange | null) => {
      if (isSyncingRef.current || !range) return;
      isSyncingRef.current = true;
      try {
        subChart.timeScale().setVisibleLogicalRange(range);
      } finally {
        isSyncingRef.current = false;
      }
    };

    mainChartApi.timeScale().subscribeVisibleLogicalRangeChange(handleMainRangeChange);
    const curr = mainChartApi.timeScale().getVisibleLogicalRange();
    if (curr) {
      subChart.timeScale().setVisibleLogicalRange(curr);
    }
  }, [mainChartApi]);

  // Populate data when candles change
  useEffect(() => {
    if (candles.length === 0 || !chartRef.current) return;

    if (type === "MACD") {
      const macdRes = calculateMACD(candles as OHLCV[], 12, 26, 9);
      const macdData = [];
      const sigData = [];
      const histData = [];

      for (let i = 0; i < candles.length; i++) {
        const time = candles[i].timestamp as UTCTimestamp;
        const m = macdRes.macdLine[i];
        const s = macdRes.signalLine[i];
        const h = macdRes.histogram[i];

        if (m !== null) macdData.push({ time, value: m });
        if (s !== null) sigData.push({ time, value: s });
        if (h !== null) {
          histData.push({
            time,
            value: h,
            color: h >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(244, 63, 94, 0.7)",
          });
        }
      }

      macdLineSeriesRef.current?.setData(macdData);
      macdSignalSeriesRef.current?.setData(sigData);
      macdHistSeriesRef.current?.setData(histData);

      const lastM = macdRes.macdLine[candles.length - 1];
      const lastS = macdRes.signalLine[candles.length - 1];
      const lastH = macdRes.histogram[candles.length - 1];
      setLatestValues({ val1: lastM, val2: lastS, val3: lastH });
    } else {
      const rsiRes = calculateRSI(candles as OHLCV[], 14);
      const rsiData = [];

      for (let i = 0; i < candles.length; i++) {
        const time = candles[i].timestamp as UTCTimestamp;
        const val = rsiRes[i];
        if (val !== null) {
          rsiData.push({ time, value: val });
        }
      }

      rsiSeriesRef.current?.setData(rsiData);
      const lastR = rsiRes[candles.length - 1];
      setLatestValues({ val1: lastR });
    }
  }, [candles, type]);

  return (
    <div className="relative w-full border-t border-slate-800/80 bg-[#090d16] select-none">
      {/* Sub-chart Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/70 border-b border-slate-800/50 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          {type === "MACD" ? (
            <>
              <Activity size={12} className="text-sky-400" />
              <span className="font-bold text-slate-300">MACD (12, 26, 9)</span>
              {latestValues.val1 !== undefined && latestValues.val1 !== null && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-sky-400">
                    MACD: <strong>{latestValues.val1.toFixed(2)}</strong>
                  </span>
                  <span className="text-amber-400">
                    Signal: <strong>{latestValues.val2?.toFixed(2) ?? "--"}</strong>
                  </span>
                  <span
                    className={
                      (latestValues.val3 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    Hist: <strong>{latestValues.val3?.toFixed(2) ?? "--"}</strong>
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <TrendingUp size={12} className="text-purple-400" />
              <span className="font-bold text-slate-300">RSI (14)</span>
              {latestValues.val1 !== undefined && latestValues.val1 !== null && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className={`font-bold ${
                      latestValues.val1 >= 70
                        ? "text-rose-400"
                        : latestValues.val1 <= 30
                        ? "text-emerald-400"
                        : "text-purple-300"
                    }`}
                  >
                    {latestValues.val1.toFixed(1)}
                  </span>
                  <span className="text-slate-500">
                    ({latestValues.val1 >= 70
                      ? "Overbought"
                      : latestValues.val1 <= 30
                      ? "Oversold"
                      : "Neutral"})
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Close ${type}`}
        >
          <X size={12} />
        </button>
      </div>

      {/* Sub-chart container */}
      <div ref={containerRef} style={{ height: `${height}px` }} className="w-full" />
    </div>
  );
};
