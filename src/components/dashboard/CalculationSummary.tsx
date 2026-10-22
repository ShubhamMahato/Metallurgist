import React from "react";
import { CheckCircle2, AlertTriangle, Award, HelpCircle, Coins } from "lucide-react";
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
      : (precision === 3 ? "0.000" : "0.00");

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2.5 w-full">
      {/* 1. Total Concentration Card */}
      <div
        className={`flex items-center gap-1.5 sm:gap-2 px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border bg-white shadow-2xs sm:shadow-xs min-w-0 ${
          isVerified ? "border-emerald-300" : "border-amber-300"
        }`}
      >
        <div
          className={`w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center shrink-0 ${
            isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isVerified ? (
            <CheckCircle2 size={12} className="sm:w-4 sm:h-4" aria-hidden="true" />
          ) : (
            <AlertTriangle size={12} className="sm:w-4 sm:h-4" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {t("totalComposition")}
            </span>
            <Tooltip content="Total concentration should equal 100%.">
              <button
                type="button"
                className="hidden sm:inline-block text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Total concentration info"
              >
                <HelpCircle size={10} />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-baseline gap-1 min-w-0">
            <span
              className={`text-xs sm:text-base lg:text-lg font-bold font-mono tabular-nums leading-tight whitespace-nowrap ${
                isVerified ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              {totalAggregate}%
            </span>
            <span
              className={`text-[8px] sm:text-[10px] font-semibold px-1 py-0.2 rounded shrink-0 hidden xs:inline ${
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

      {/* 2. Karat Rating Card */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white shadow-2xs sm:shadow-xs min-w-0">
        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Award size={12} className="sm:w-4 sm:h-4" aria-hidden="true" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {t("karatRating")}
            </span>
            <Tooltip content="Calculated from Gold (Au) percentage: (Gold % × 24) / 100.">
              <button
                type="button"
                className="hidden sm:inline-block text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Karat info"
              >
                <HelpCircle size={10} />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xs sm:text-base lg:text-lg font-bold font-mono tabular-nums text-slate-900 leading-tight whitespace-nowrap">
              {karatDisplay || (karat.endsWith("K") ? karat : `${karat}K`)}
            </span>
            {karatDisplay && (
              <span className="hidden md:inline text-[9px] sm:text-[10px] font-mono text-slate-400 truncate">
                ({karat.endsWith("K") ? karat : `${karat}K`})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Fine 24K Gold Weight Card */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white shadow-2xs sm:shadow-xs min-w-0">
        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Coins size={12} className="sm:w-4 sm:h-4" aria-hidden="true" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {t("fineGoldWeight")}
            </span>
            <Tooltip content="Calculated Fine Gold (24K) weight: Total Weight × (Gold % / 100).">
              <button
                type="button"
                className="hidden sm:inline-block text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Fine gold weight info"
              >
                <HelpCircle size={10} />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-baseline gap-0.5 min-w-0">
            <span className="text-xs sm:text-base lg:text-lg font-bold font-mono tabular-nums text-slate-900 leading-tight whitespace-nowrap">
              {fineGoldWeight}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-slate-500 shrink-0">
              g
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculationSummary;
