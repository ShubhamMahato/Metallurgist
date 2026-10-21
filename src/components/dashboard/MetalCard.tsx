import React from "react";
import {
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { MetalValue } from "../../types/dashboard";
import { Tooltip } from "../common/Tooltip";
import { useLanguage } from "../../lib/LanguageContext";

interface MetalCardProps {
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

export const MetalCard: React.FC<MetalCardProps> = ({
  metal,
  lastEditedId,
  tempValues,
  handleValueChange,
  handleValueBlur,
  removeMetal,
  decimalPrecision = 2,
}) => {
  const { t } = useLanguage();
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
    (h) => Math.abs(h.delta) >= (precision === 2 ? 0.01 : 0.001) && Math.abs(h.from - h.to) >= (precision === 2 ? 0.01 : 0.001)
  );

  const translatedName = t(metal.id as any) || metal.name;

  return (
    <div
      className={`flex flex-col bg-white rounded-xl border transition-all shadow-xs ${
        isEditing
          ? "border-slate-900 ring-2 ring-slate-900/10"
          : "border-slate-300 hover:border-slate-400"
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-md ${badgeTheme.bg} ${badgeTheme.text} flex items-center justify-center font-mono font-bold text-xs shadow-xs shrink-0`}
            aria-hidden="true"
          >
            {metal.symbol}
          </div>

          <span className="text-sm font-bold text-slate-900 truncate">
            {translatedName}
          </span>
        </div>

        {/* Remove Action for manual metals */}
        {metal.isManual && (
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip content={t("remove")}>
              <button
                type="button"
                onClick={() => removeMetal(metal.id)}
                aria-label={`Remove ${translatedName}`}
                className="p-1.5 text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-slate-300 rounded-md transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Value Input Section */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <label
            htmlFor={`input-metal-${metal.id}`}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
          >
            {t("concentration")}
          </label>

          <div className="relative flex items-center">
            <input
              id={`input-metal-${metal.id}`}
              type="text"
              inputMode="decimal"
              value={tempValues[metal.id] ?? metal.value}
              onChange={(e) => handleValueChange(metal.id, e.target.value)}
              onBlur={() => handleValueBlur(metal.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              aria-label={`${translatedName} ${t("concentration")}`}
              className={`w-full font-mono font-bold text-lg text-slate-900 bg-slate-50 border rounded-lg py-1.5 pl-3 pr-8 focus:bg-white focus:border-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 ${
                isEditing ? "border-slate-900 bg-white" : "border-slate-300"
              }`}
            />
            <div className="absolute right-2.5 flex items-center pointer-events-none text-slate-500 font-mono font-bold text-xs">
              %
            </div>
          </div>

          {/* Baseline Comparison Delta */}
          {hasChangedFromBaseline && (
            <div className="mt-2.5 flex items-center justify-between text-xs bg-slate-100 border border-slate-200 rounded-md p-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-600 font-medium text-[11px] shrink-0">
                  Original:{" "}
                  <span className="font-mono font-semibold text-slate-800">
                    {baseline.toFixed(precision)}%
                  </span>
                </span>
                {metal.lastAdjustedBy && metal.lastAdjustedBy !== "User" && (
                  <span className="text-[10px] text-slate-500 font-medium truncate">
                    (via {metal.lastAdjustedBy})
                  </span>
                )}
              </div>
              <span
                className={`font-mono font-bold text-[11px] flex items-center gap-0.5 shrink-0 ${
                  deltaNum > 0 ? "text-emerald-700" : "text-amber-800"
                }`}
              >
                {deltaNum > 0 ? (
                  <TrendingUp size={12} aria-hidden="true" />
                ) : (
                  <TrendingDown size={12} aria-hidden="true" />
                )}
                {delta}%
              </span>
            </div>
          )}
        </div>

        {/* Audit Log */}
        {visibleHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {t("audit")}
              </span>
              {metal.lastAdjustedBy && metal.lastAdjustedBy !== "User" && (
                <span className="text-[10px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                  via {metal.lastAdjustedBy}
                </span>
              )}
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-600">
              {visibleHistory.slice(-2).map((h, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-700">
                      {h.from.toFixed(precision)}% → {h.to.toFixed(precision)}%
                    </span>
                    {h.source && (
                      <span
                        className={`text-[9px] font-sans font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          h.source === "User Edit" || h.source === "User"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {h.source === "User Edit" || h.source === "User"
                          ? "Direct"
                          : `via ${h.source}`}
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-bold shrink-0 ${
                      h.delta > 0 ? "text-emerald-700" : "text-amber-800"
                    }`}
                  >
                    ({h.delta > 0 ? "+" : ""}{h.delta.toFixed(3)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetalCard;
