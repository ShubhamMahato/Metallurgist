import React from "react";
import { Trash2, TrendingUp, TrendingDown, History } from "lucide-react";
import { MetalValue } from "../../types/dashboard";
import { Tooltip } from "../common/Tooltip";
import { useLanguage } from "../../lib/LanguageContext";

interface MetalCompactRowProps {
  metal: MetalValue;
  lastEditedId: string | null;
  tempValues: Record<string, string>;
  handleValueChange: (id: string, value: string) => void;
  handleValueBlur: (id: string) => void;
  removeMetal: (id: string) => void;
  decimalPrecision?: number;
}

const ELEMENT_BADGES: Record<string, { bg: string; text: string }> = {
  gold: { bg: "bg-amber-600", text: "text-white" },
  silver: { bg: "bg-slate-700", text: "text-white" },
  copper: { bg: "bg-orange-700", text: "text-white" },
  zinc: { bg: "bg-teal-700", text: "text-white" },
  platinum: { bg: "bg-indigo-700", text: "text-white" },
  palladium: { bg: "bg-cyan-800", text: "text-white" },
};

const DEFAULT_BADGE = { bg: "bg-slate-800", text: "text-white" };

export const MetalCompactRow: React.FC<MetalCompactRowProps> = ({
  metal,
  lastEditedId,
  tempValues,
  handleValueChange,
  handleValueBlur,
  removeMetal,
  decimalPrecision = 2,
}) => {
  const { t } = useLanguage();
  const [showHistory, setShowHistory] = React.useState(false);
  const precision = decimalPrecision === 3 ? 3 : 2;
  const isEditing = lastEditedId === metal.id;
  const badgeTheme = ELEMENT_BADGES[metal.id] || DEFAULT_BADGE;
  const numericValue = parseFloat(tempValues[metal.id] ?? metal.value) || 0;
  const baseline = metal.baseline ?? 0;
  const deltaNum = Math.round((numericValue - baseline) * 1000) / 1000;
  const hasChangedFromBaseline =
    baseline > 0 && Math.abs(deltaNum) >= (precision === 2 ? 0.01 : 0.001);
  const delta = deltaNum > 0 ? `+${deltaNum.toFixed(precision)}` : deltaNum.toFixed(precision);

  const visibleHistory = (metal.history || []).filter(
    (h) =>
      Math.abs(h.delta) >= (precision === 2 ? 0.01 : 0.001) &&
      Math.abs(h.from - h.to) >= (precision === 2 ? 0.01 : 0.001)
  );

  const translatedName = t(metal.id as any) || metal.name;

  const selectAll = (el: HTMLInputElement) => {
    try {
      el.select();
      el.setSelectionRange(0, el.value.length);
    } catch {
      el.select();
    }
  };

  return (
    <div
      className={`px-3 py-2 sm:py-2.5 transition-colors ${
        isEditing ? "bg-sky-50/60" : "hover:bg-slate-50/70"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: Element Symbol & Name + Baseline/Delta Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md ${badgeTheme.bg} ${badgeTheme.text} flex items-center justify-center font-mono font-bold text-xs shadow-2xs shrink-0 select-none`}
            aria-hidden="true"
          >
            {metal.symbol}
          </div>

          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {translatedName}
              </span>
              {metal.isManual && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold shrink-0">
                  Manual
                </span>
              )}
              {visibleHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory((prev) => !prev)}
                  title={`${visibleHistory.length} edit history`}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                >
                  <History size={11} />
                </button>
              )}
            </div>

            {hasChangedFromBaseline ? (
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono mt-0.5">
                <span className="text-slate-500">
                  Orig: <span className="font-semibold text-slate-700">{baseline.toFixed(precision)}%</span>
                </span>
                <span
                  className={`font-bold inline-flex items-center gap-0.5 ${
                    deltaNum > 0 ? "text-emerald-700" : "text-amber-800"
                  }`}
                >
                  {deltaNum > 0 ? (
                    <TrendingUp size={10} aria-hidden="true" />
                  ) : (
                    <TrendingDown size={10} aria-hidden="true" />
                  )}
                  {delta}%
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                Baseline {baseline > 0 ? `${baseline.toFixed(precision)}%` : "0%"}
              </span>
            )}
          </div>
        </div>

        {/* Right: Thumb-friendly input field & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative flex items-center">
            <input
              id={`input-compact-${metal.id}`}
              type="text"
              inputMode="decimal"
              value={tempValues[metal.id] ?? metal.value}
              onChange={(e) => handleValueChange(metal.id, e.target.value)}
              onFocus={(e) => selectAll(e.currentTarget)}
              onClick={(e) => selectAll(e.currentTarget)}
              onBlur={() => handleValueBlur(metal.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              aria-label={`${translatedName} concentration`}
              className={`w-24 sm:w-28 h-9 sm:h-10 text-right font-mono font-bold text-sm sm:text-base text-slate-900 bg-white border rounded-lg pl-2 pr-6 focus:bg-white focus:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 selection:bg-sky-200 selection:text-slate-900 transition-colors ${
                isEditing
                  ? "border-sky-400 ring-2 ring-sky-100 bg-white"
                  : "border-slate-300 hover:border-slate-400"
              }`}
            />
            <span className="absolute right-2 text-xs font-mono font-bold text-slate-400 pointer-events-none select-none">
              %
            </span>
          </div>

          {metal.isManual && (
            <Tooltip content={t("remove")}>
              <button
                type="button"
                onClick={() => removeMetal(metal.id)}
                aria-label={`Remove ${translatedName}`}
                className="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Expandable Mini Audit History */}
      {showHistory && visibleHistory.length > 0 && (
        <div className="mt-2 pt-1.5 border-t border-slate-200/80 pl-9 space-y-1 text-[10px] font-mono text-slate-600 animate-in fade-in duration-100">
          {visibleHistory.slice(-2).map((h, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-100/70 px-2 py-0.5 rounded">
              <span>
                {h.from.toFixed(precision)}% → {h.to.toFixed(precision)}%
              </span>
              <span className={h.delta > 0 ? "text-emerald-700 font-bold" : "text-amber-800 font-bold"}>
                ({h.delta > 0 ? "+" : ""}{h.delta.toFixed(3)}%) {h.source ? `[${h.source}]` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MetalCompactRow;
