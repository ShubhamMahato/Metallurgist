import React from "react";
import { Tooltip } from "../common/Tooltip";
import { useLanguage } from "../../lib/LanguageContext";

interface CalculationSummaryProps {
  totalAggregate: string;
  isVerified: boolean;
  karat: string;
  karatDisplay?: string;
  isParsed: boolean;
  goldValue?: string;
  weight?: string;
  decimalPrecision?: number;
}

export const CalculationSummary: React.FC<CalculationSummaryProps> = ({
  totalAggregate,
  isVerified,
  karat,
  karatDisplay,
  isParsed,
  goldValue,
  weight,
  decimalPrecision = 2,
}) => {
  const { t } = useLanguage();

  if (!isParsed) return null;

  const precision = decimalPrecision === 3 ? 3 : 2;
  const aggregateNum = parseFloat(totalAggregate) || 0;
  const delta = (aggregateNum - 100).toFixed(precision);
  const deltaNum = parseFloat(delta);

  const weightNum = parseFloat(weight || "0");
  const goldPurityNum = parseFloat(goldValue || "0");
  const fineGoldWeight =
    weightNum > 0 && goldPurityNum > 0
      ? ((weightNum * goldPurityNum) / 100).toFixed(precision)
      : precision === 3 ? "0.000" : "0.00";

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs sm:shadow-xs overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        {/* 1. Total Concentration */}
        <Tooltip content={isVerified ? "Total concentration is 100% (Balanced)" : `Needs balance by ${delta}%`}>
          <div
            className={`p-2 sm:p-2.5 flex flex-col justify-center min-w-0 transition-colors cursor-default ${
              !isVerified ? "bg-amber-50/50" : "hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
                aria-hidden="true"
              />
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                {t("totalComposition")}
              </span>
            </div>

            <div className="flex items-baseline gap-1 min-w-0">
              <span
                className={`text-xs sm:text-base lg:text-lg font-mono font-bold tabular-nums whitespace-nowrap leading-tight ${
                  isVerified ? "text-emerald-700" : "text-amber-800"
                }`}
              >
                {totalAggregate}%
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-semibold px-1 py-0.2 rounded-xs shrink-0 hidden xs:inline ${
                  isVerified
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                    : "text-amber-900 bg-amber-100 border border-amber-200"
                }`}
              >
                {isVerified ? t("balanced") : `${deltaNum > 0 ? "+" : ""}${delta}%`}
              </span>
            </div>
          </div>
        </Tooltip>

        {/* 2. Karat Rating */}
        <Tooltip content="Calculated Karat rating from Gold percentage: (Gold % × 24) / 100">
          <div className="p-2 sm:p-2.5 flex flex-col justify-center min-w-0 bg-amber-50/20 hover:bg-amber-50/40 transition-colors cursor-default">
            <span className="text-[10px] sm:text-xs font-semibold text-amber-900/80 uppercase tracking-wider truncate mb-0.5">
              {t("karatRating")}
            </span>
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-xs sm:text-base lg:text-lg font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap leading-tight">
                {karatDisplay || (karat.endsWith("K") ? karat : `${karat}K`)}
              </span>
            </div>
          </div>
        </Tooltip>

        {/* 3. Fine 24K Gold Weight */}
        <Tooltip content="Calculated Fine Gold (24K) weight: Total Weight × (Gold % / 100)">
          <div className="p-2 sm:p-2.5 flex flex-col justify-center min-w-0 hover:bg-slate-50/50 transition-colors cursor-default">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate mb-0.5">
              {t("fineGoldWeight")}
            </span>
            <div className="flex items-baseline gap-0.5 min-w-0">
              <span className="text-xs sm:text-base lg:text-lg font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap leading-tight">
                {fineGoldWeight}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 shrink-0">
                g
              </span>
            </div>
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default CalculationSummary;
