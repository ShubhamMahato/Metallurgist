import React from "react";
import {
  Lock,
  Unlock,
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
  toggleLock: (id: string) => void;
  removeMetal: (id: string) => void;
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
  toggleLock,
  removeMetal,
}) => {
  const { t } = useLanguage();
  const isEditing = lastEditedId === metal.id;
  const badgeTheme = ELEMENT_BADGES[metal.id] || DEFAULT_BADGE;
  const numericValue = parseFloat(tempValues[metal.id] ?? metal.value) || 0;
  const baseline = metal.baseline ?? 0;
  const hasChangedFromBaseline =
    baseline > 0 && Math.abs(numericValue - baseline) > 0.001;
  const delta = (numericValue - baseline).toFixed(3);
  const deltaNum = parseFloat(delta);

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

        {/* Lock and Remove Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip
            content={
              metal.locked
                ? "Locked: Value stays fixed during rebalancing."
                : "Unlocked: Recalculates automatically when other metals change."
            }
          >
            <button
              type="button"
              onClick={() => toggleLock(metal.id)}
              aria-label={
                metal.locked
                  ? `Unlock ${translatedName}`
                  : `Lock ${translatedName}`
              }
              aria-pressed={metal.locked}
              className={`px-2 py-1 rounded-md border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                metal.locked
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {metal.locked ? <Lock size={12} /> : <Unlock size={12} />}
              <span className="text-[11px]">
                {metal.locked ? t("lock") : t("free")}
              </span>
            </button>
          </Tooltip>

          {metal.isManual && (
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
          )}
        </div>
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
              disabled={metal.locked}
              aria-label={`${translatedName} ${t("concentration")}`}
              className={`w-full font-mono font-bold text-lg text-slate-900 bg-slate-50 border rounded-lg py-1.5 pl-3 pr-10 focus:bg-white focus:border-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 disabled:opacity-60 disabled:bg-slate-100 ${
                isEditing ? "border-slate-900 bg-white" : "border-slate-300"
              }`}
            />
            <div className="absolute right-3 flex items-center pointer-events-none text-slate-500 font-mono font-bold text-sm">
              %
            </div>
          </div>

          {/* Baseline Comparison Delta */}
          {hasChangedFromBaseline && (
            <div className="mt-2.5 flex items-center justify-between text-xs bg-slate-100 border border-slate-200 rounded-md p-1.5">
              <span className="text-slate-600 font-medium text-[11px]">
                Original:{" "}
                <span className="font-mono font-semibold text-slate-800">
                  {baseline.toFixed(3)}%
                </span>
              </span>
              <span
                className={`font-mono font-bold text-[11px] flex items-center gap-0.5 ${
                  deltaNum > 0 ? "text-emerald-700" : "text-amber-800"
                }`}
              >
                {deltaNum > 0 ? (
                  <TrendingUp size={12} aria-hidden="true" />
                ) : (
                  <TrendingDown size={12} aria-hidden="true" />
                )}
                {deltaNum > 0 ? `+${delta}` : delta}%
              </span>
            </div>
          )}
        </div>

        {/* Audit Log */}
        {metal.history && metal.history.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("audit")}
            </span>
            <div className="space-y-1 text-[11px] font-mono text-slate-600">
              {metal.history.slice(-2).map((h, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]"
                >
                  <span className="text-slate-700">
                    {h.from.toFixed(3)}% → {h.to.toFixed(3)}%
                  </span>
                  <span
                    className={`font-bold ${
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
