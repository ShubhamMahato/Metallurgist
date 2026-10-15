import React from "react";
import { CheckCircle2, AlertTriangle, Award, HelpCircle } from "lucide-react";
import { Tooltip } from "../common/Tooltip";
import { useLanguage } from "../../lib/LanguageContext";

interface CalculationSummaryProps {
  totalAggregate: string;
  isVerified: boolean;
  karat: string;
  karatDisplay?: string;
  isParsed: boolean;
  goldValue?: string;
}

export const CalculationSummary: React.FC<CalculationSummaryProps> = ({
  totalAggregate,
  isVerified,
  karat,
  karatDisplay,
  isParsed,
}) => {
  const { t } = useLanguage();

  if (!isParsed) return null;

  const aggregateNum = parseFloat(totalAggregate) || 0;
  const delta = (aggregateNum - 100).toFixed(3);
  const deltaNum = parseFloat(delta);

  return (
    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
      {/* Total Concentration Card */}
      <div
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-white shadow-xs ${
          isVerified
            ? "border-emerald-300"
            : "border-amber-300"
        }`}
      >
        <div
          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
            isVerified
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {isVerified ? (
            <CheckCircle2 size={15} aria-hidden="true" />
          ) : (
            <AlertTriangle size={15} aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
              {t("totalComposition")}
            </span>
            <Tooltip content="Total concentration should equal 100.000%.">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Total concentration info"
              >
                <HelpCircle size={11} />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span
              className={`text-base sm:text-lg font-bold font-mono tabular-nums leading-none ${
                isVerified ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              {totalAggregate}%
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                isVerified
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {isVerified ? t("balanced") : `${deltaNum > 0 ? "+" : ""}${delta}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Karat Rating Card */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-300 bg-white shadow-xs">
        <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Award size={15} aria-hidden="true" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
              {t("karatRating")}
            </span>
            <Tooltip content="Calculated from Gold (Au) percentage: (Gold % × 24) / 100.">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Karat info"
              >
                <HelpCircle size={11} />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 leading-none">
              {karatDisplay || (karat.endsWith("K") ? karat : `${karat}K`)}
            </span>
            {karatDisplay && (
              <span className="text-[10px] font-mono text-slate-500">
                ({karat.endsWith("K") ? karat : `${karat}K`} {t("exactKarat")})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculationSummary;
