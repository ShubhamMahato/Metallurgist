import React from "react";
import { ShieldCheck, Gem, History, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface CalculationSummaryProps {
  totalAggregate: string;
  isVerified: boolean;
  karat: string;
  karatDisplay?: string;
  isParsed: boolean;
  resetToOriginal?: () => void;
  onSaveFinalReport?: () => void;
  isSavingFinalReport?: boolean;
}

export const CalculationSummary: React.FC<CalculationSummaryProps> = ({
  totalAggregate,
  isVerified,
  karat,
  karatDisplay,
  isParsed,
}) => {
  return (
    <div
      className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto"
      style={{
        opacity: isParsed ? 1 : 0,
        transform: isParsed ? "none" : "translateY(10px)",
        transition: "all 0.5s ease",
        pointerEvents: isParsed ? "auto" : "none",
      }}
    >
      <div className="flex items-center gap-1.5 sm:gap-3 bg-white/40 backdrop-blur-xl px-2 sm:px-4 py-2 rounded-2xl border border-white/40 shadow-sm">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
          <ShieldCheck size={14} className="sm:w-4 sm:h-4" />
        </div>
        <div className="flex flex-col">
          <p className="text-[7px] sm:text-[8px] font-black text-outline uppercase tracking-widest leading-none mb-1">
            Aggregate
          </p>
          <div className="flex items-baseline gap-0.5">
            <motion.span
              key={totalAggregate}
              className={`text-lg sm:text-xl font-black font-headline ${
                isVerified ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalAggregate}
            </motion.span>
            <span className="text-[7px] sm:text-[8px] font-bold text-outline">
              %
            </span>
          </div>
        </div>
      </div>

      <div
        title={`Exact Karat value: ${karat}K`}
        className="flex items-center gap-1.5 sm:gap-3 bg-white/40 backdrop-blur-xl px-2 sm:px-4 py-2 rounded-2xl border border-white/40 shadow-sm"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
          <Gem size={14} className="sm:w-4 sm:h-4" />
        </div>
        <div className="flex flex-col">
          <p className="text-[7px] sm:text-[8px] font-black text-outline uppercase tracking-widest leading-none mb-1">
            Karat
          </p>
          <div className="flex items-baseline gap-0.5">
            <motion.span
              key={karatDisplay || karat}
              className="text-lg sm:text-xl font-black font-headline text-primary"
            >
              {karatDisplay || karat}
            </motion.span>
            {!karatDisplay && (
              <span className="text-[7px] sm:text-[8px] font-black text-outline uppercase tracking-widest ml-0.5">
                K
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
