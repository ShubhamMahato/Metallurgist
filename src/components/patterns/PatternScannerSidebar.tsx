import React, { useState } from "react";
import {
  DetectedPattern,
  PatternDirection,
  PatternFamily,
  PatternLifecycleState,
} from "../../services/patternEngine/types/pattern";
import { explainPattern } from "../../services/patternEngine/core/patternExplainer";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  X,
  Target,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from "lucide-react";

interface PatternScannerSidebarProps {
  patterns: DetectedPattern[];
  selectedPatternIds: string[];
  onToggleSelectPattern: (id: string) => void;
  onClearSelection: () => void;
  isMultiSelect: boolean;
  onToggleMultiSelect: () => void;
  symbol?: string;
  timeframe?: string;
  onViewOnChart?: () => void;
}

export const PatternScannerSidebar: React.FC<PatternScannerSidebarProps> = ({
  patterns,
  selectedPatternIds,
  onToggleSelectPattern,
  onClearSelection,
  isMultiSelect,
  onToggleMultiSelect,
  symbol = "XAU/USD",
  timeframe = "5m",
  onViewOnChart,
}) => {
  const [selectedFamily, setSelectedFamily] = useState<string>("ALL");
  const [isDetailCollapsed, setIsDetailCollapsed] = useState<boolean>(() => {
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });

  // Filter detected patterns
  const filteredPatterns = patterns.filter((p) => {
    if (selectedFamily !== "ALL" && p.family !== selectedFamily) return false;
    return true;
  });

  // Find the primarily selected pattern for detail drawer
  const activeDetailPattern = patterns.find((p) => selectedPatternIds[0] === p.id);
  const activeExpl = activeDetailPattern ? explainPattern(activeDetailPattern) : null;

  const getDirectionIcon = (dir: PatternDirection) => {
    if (dir === "BULLISH") return <ArrowUpRight size={14} className="text-emerald-400 stroke-[2.5]" />;
    if (dir === "BEARISH") return <ArrowDownRight size={14} className="text-rose-400 stroke-[2.5]" />;
    return <Minus size={14} className="text-amber-400" />;
  };

  const getFamilyLabel = (fam: PatternFamily) => {
    switch (fam) {
      case "CLASSICAL_CHART":
        return "Classical";
      case "CANDLESTICK":
        return "Candle";
      case "HARMONIC":
        return "Harmonic";
      case "MARKET_STRUCTURE":
        return "Structure";
      case "STATISTICAL":
        return "Statistical";
      default:
        return fam;
    }
  };

  const getStateBadge = (state: PatternLifecycleState) => {
    switch (state) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <CheckCircle2 size={9} /> Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Sparkles size={9} /> Completed
          </span>
        );
      case "FORMING":
        return (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
            <Clock size={9} /> Forming
          </span>
        );
      case "DEVELOPING":
        return (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
            <Compass size={9} /> Developing
          </span>
        );
      case "INVALIDATED":
        return (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-900">
            <AlertTriangle size={9} /> Invalid
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 bg-[#0b101b] border-t lg:border-t-0 lg:border-l border-slate-800 text-slate-200 overflow-hidden">
      {/* 1. Header (Trading Terminal Style) */}
      <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-950/80">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Pattern Scanner
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono font-bold text-amber-400">
                {symbol} · {timeframe}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Detected: <strong className="text-slate-100">{patterns.length}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedPatternIds.length > 0 && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-950/70 transition-colors cursor-pointer flex items-center gap-1 border border-rose-900"
                title="Clear chart overlay"
              >
                <X size={11} /> Clear
              </button>
            )}
            <button
              type="button"
              onClick={onToggleMultiSelect}
              className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer border ${
                isMultiSelect
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700"
              }`}
              title="Allow comparing multiple pattern overlays on the chart"
            >
              Multi
            </button>
          </div>
        </div>

        {/* 2. Compact Family Filters */}
        <div className="flex items-center gap-1 overflow-x-auto mt-2.5 pb-0.5 no-scrollbar touch-pan-x">
          {[
            { id: "ALL", label: "All" },
            { id: "CANDLESTICK", label: "Candle" },
            { id: "CLASSICAL_CHART", label: "Classical" },
            { id: "HARMONIC", label: "Harmonic" },
            { id: "MARKET_STRUCTURE", label: "Structure" },
            { id: "STATISTICAL", label: "Statistical" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedFamily(cat.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedFamily === cat.id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Detected Patterns List - Guaranteed Smooth Independent Vertical Scrolling on Mobile & Desktop */}
      <div
        className="flex-1 min-h-[140px] overflow-y-auto p-2 space-y-2 custom-scrollbar touch-pan-y overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
      >
        {filteredPatterns.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <Layers size={24} className="mb-2 text-slate-600" />
            <p className="text-xs font-semibold text-slate-400">
              No patterns detected on {timeframe} yet.
            </p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">
              The scanner continuously evaluates incoming candles for valid setups and updates live.
            </p>
          </div>
        ) : (
          filteredPatterns.map((pat, idx) => {
            const isSelected = selectedPatternIds.includes(pat.id);
            const expl = explainPattern(pat);
            const isBullish = pat.direction === "BULLISH";
            const isBearish = pat.direction === "BEARISH";

            return (
              <div
                key={pat.id}
                onClick={() => onToggleSelectPattern(pat.id)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer relative group ${
                  isSelected
                    ? "bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/50"
                    : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700"
                }`}
              >
                {/* Top Row: Index, Name, Direction Badge */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-slate-100 truncate group-hover:text-amber-400 transition-colors">
                      {pat.name}
                    </span>
                  </div>

                  {/* Direction Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${
                      isBullish
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : isBearish
                        ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {getDirectionIcon(pat.direction)}
                    <span>{isBullish ? "BULLISH" : isBearish ? "BEARISH" : "NEUTRAL"}</span>
                  </span>
                </div>

                {/* Sub Row: Family Tag & State */}
                <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-slate-400">
                  <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                    {getFamilyLabel(pat.family)}
                  </span>
                  <div>{getStateBadge(pat.state)}</div>
                </div>

                {/* Completeness Progress Bar for forming/developing patterns */}
                {pat.completenessScore !== undefined && pat.state !== "CONFIRMED" && pat.state !== "INVALIDATED" && (
                  <div className="mt-1.5 space-y-0.5">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span>Formation Progress</span>
                      <span className="font-bold text-amber-400">{pat.completenessScore}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pat.state === "DEVELOPING" ? "bg-cyan-400" : "bg-purple-400"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, pat.completenessScore))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Forward Projection Strip */}
                {pat.projection && (
                  <div className="mt-1.5 flex items-center justify-between gap-1 px-1.5 py-1 rounded bg-slate-950/70 border border-slate-800 font-mono text-[9px]">
                    <span className="text-slate-400 truncate">
                      Breakout: <strong className="text-amber-400">${pat.projection.breakoutLevel.toFixed(2)}</strong>
                    </span>
                    {pat.projection.targetZone && (
                      <span className="text-emerald-400 shrink-0 font-semibold">
                        Target: ${pat.projection.targetZone.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}

                {/* Prominent "WHERE WILL IT GO?" Box */}
                <div
                  className={`mt-2 p-1.5 rounded border text-[11px] leading-tight ${
                    isBullish
                      ? "bg-emerald-950/30 border-emerald-900/60 text-emerald-300"
                      : isBearish
                      ? "bg-rose-950/30 border-rose-900/60 text-rose-300"
                      : "bg-amber-950/30 border-amber-900/60 text-amber-300"
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span className="font-mono text-[10px]">
                      {expl.expectedSummary}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {expl.whereItWillGo}
                  </p>
                </div>

                {/* Bottom hint */}
                <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <div className="flex items-center gap-2">
                    <span>{isSelected ? "✓ Overlay active" : "Tap to view guide & overlay"}</span>
                    {isSelected && onViewOnChart && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewOnChart();
                        }}
                        className="lg:hidden text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        View on Chart →
                      </button>
                    )}
                  </div>
                  {pat.confidence && (
                    <span>Confidence: {(pat.confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Selected Pattern Educational & Actionable Drawer (Docked at bottom) */}
      {activeDetailPattern && activeExpl && (
        <div className="border-t border-slate-800 bg-slate-950 shrink-0 max-h-[180px] sm:max-h-[220px] lg:max-h-[45%] flex flex-col min-h-0">
          <div
            onClick={() => setIsDetailCollapsed(!isDetailCollapsed)}
            className="flex items-center justify-between px-3 py-1.5 bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800 cursor-pointer shrink-0 hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-1.5 truncate min-w-0">
              <Compass size={12} className="text-amber-400 shrink-0" />
              <span className="truncate">Trading Guide: {activeDetailPattern.name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              {onViewOnChart && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewOnChart();
                  }}
                  className="lg:hidden text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded cursor-pointer"
                >
                  View on Chart →
                </button>
              )}
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] font-normal lowercase">{isDetailCollapsed ? "expand" : "collapse"}</span>
                {isDetailCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>
            </div>
          </div>

          {!isDetailCollapsed && (
            <div
              className="p-2.5 text-[11px] space-y-2 overflow-y-auto custom-scrollbar min-h-0 touch-pan-y overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
            >
              {/* WHERE WILL PRICE GO? */}
              <div className="p-2 rounded bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <span>Where will price go?</span>
                </div>
                <p className="text-xs text-slate-100 font-semibold leading-snug">
                  {activeExpl.whereItWillGo}
                </p>
                <div className="text-[10px] font-mono text-slate-400">
                  {activeExpl.expectedSummary}
                </div>
              </div>

              {/* FORWARD PROJECTION & TARGETS */}
              {activeDetailPattern.projection && (
                <div className="p-2 rounded bg-cyan-950/20 border border-cyan-800/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                      <Compass size={11} /> Forward Projection
                    </span>
                    {activeDetailPattern.completenessScore !== undefined && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                        {activeDetailPattern.completenessScore}% Complete
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-300 leading-normal">
                    {activeDetailPattern.projection.description}
                  </p>
                  {activeDetailPattern.projection.completionZone && (
                    <div className="text-[10px] font-mono text-cyan-300 flex items-center justify-between bg-cyan-950/40 p-1 rounded border border-cyan-900/60">
                      <span>{activeDetailPattern.projection.completionZone.label || "Completion Zone"}:</span>
                      <strong className="text-slate-100">
                        ${activeDetailPattern.projection.completionZone.min.toFixed(2)} - ${activeDetailPattern.projection.completionZone.max.toFixed(2)}
                      </strong>
                    </div>
                  )}
                  {activeDetailPattern.projection.estimatedTimeToCompletion && (
                    <div className="text-[9px] text-slate-400 flex items-center justify-between font-mono">
                      <span>Est. Completion:</span>
                      <span className="text-amber-300">{activeDetailPattern.projection.estimatedTimeToCompletion}</span>
                    </div>
                  )}
                </div>
              )}

              {/* WHAT THIS PATTERN MEANS */}
              <div className="px-2 py-1.5 rounded bg-slate-900/50 border border-slate-800/60 space-y-0.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                  What this pattern means
                </span>
                <p className="text-[10px] text-slate-300 leading-normal">
                  {activeExpl.meaning}
                </p>
              </div>

              {/* HOW TO TRADE IT */}
              <div className="px-2 py-1.5 rounded bg-slate-900/50 border border-slate-800/60 space-y-0.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                  How to trade it
                </span>
                <p className="text-[10px] text-slate-300 leading-normal">
                  {activeExpl.howToTrade}
                </p>
              </div>

              {/* Price Levels Grid */}
              <div className="grid grid-cols-3 gap-1 font-mono text-[10px] p-1.5 bg-slate-900 rounded border border-slate-800 text-center">
                <div>
                  <span className="text-slate-500 block text-[9px]">ENTRY</span>
                  <span className="text-slate-200 font-bold">
                    {activeDetailPattern.levels.entry ? `$${activeDetailPattern.levels.entry.toFixed(2)}` : "--"}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-500 block text-[9px]">TARGET</span>
                  <span className="text-emerald-400 font-bold">
                    ${(activeDetailPattern.levels.target1 ?? activeExpl.targetPrice)?.toFixed(2) ?? "--"}
                  </span>
                </div>
                <div>
                  <span className="text-rose-500 block text-[9px]">STOP LOSS</span>
                  <span className="text-rose-400 font-bold">
                    ${(activeDetailPattern.levels.stopLoss ?? activeExpl.stopPrice)?.toFixed(2) ?? "--"}
                  </span>
                </div>
              </div>

              {/* Conditions */}
              {activeDetailPattern.confirmationCondition && (
                <div className="flex items-start gap-1.5 text-slate-300 text-[10px]">
                  <Target size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Confirm:</strong> {activeDetailPattern.confirmationCondition.description}</span>
                </div>
              )}
              {activeDetailPattern.invalidationCondition && (
                <div className="flex items-start gap-1.5 text-slate-300 text-[10px]">
                  <ShieldAlert size={11} className="text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Invalidate:</strong> {activeDetailPattern.invalidationCondition.description}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
