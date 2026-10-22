import React, { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AvailableMetal, MetalValue } from "../../types/dashboard";
import { useLanguage } from "../../lib/LanguageContext";

interface AddMetalModalProps {
  isAddingMetal: boolean;
  setIsAddingMetal: (isAdding: boolean) => void;
  addMetalRef: React.RefObject<HTMLDivElement | null>;
  availableMetals: AvailableMetal[];
  metals: MetalValue[];
  addMetal: (id: string) => void;
  compact?: boolean;
}

export const AddMetalModal: React.FC<AddMetalModalProps> = ({
  isAddingMetal,
  setIsAddingMetal,
  addMetalRef,
  availableMetals,
  metals,
  addMetal,
  compact = false,
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const filteredMetals = availableMetals.filter((m) => {
    const existing = metals.find((x) => x.id === m.id);
    const isOnScreen =
      existing &&
      ((existing.baseline ?? 0) > 0 ||
        parseFloat(existing.value) > 0 ||
        existing.isManual);
    if (isOnScreen) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const translated = (t(m.id as any) || "").toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.symbol.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      translated.includes(q)
    );
  });

  return (
    <div className="relative" ref={addMetalRef as any}>
      <button
        type="button"
        onClick={() => {
          setIsAddingMetal(!isAddingMetal);
          setSearch("");
        }}
        aria-expanded={isAddingMetal}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1 font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-md sm:rounded-lg shadow-2xs sm:shadow-xs transition-colors cursor-pointer shrink-0 ${
          compact
            ? "px-2 py-1 text-[11px] sm:px-2.5 sm:py-1.5 sm:text-xs"
            : "px-2.5 py-1.5 text-xs"
        }`}
      >
        <Plus size={12} className="text-amber-600 sm:w-3.5 sm:h-3.5" />
        <span>{t("addConstituent")}</span>
      </button>

      <AnimatePresence>
        {isAddingMetal && (
          <motion.div
            role="dialog"
            aria-label={t("addConstituent")}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:top-full mt-2 w-[calc(100%-2rem)] sm:w-72 max-w-sm bg-white rounded-xl shadow-xl border border-slate-300 p-3 z-50 max-h-[80vh] sm:max-h-[380px] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900">
                {t("addConstituent")}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingMetal(false)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                aria-label={t("close")}
              >
                <X size={15} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchMetals")}
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-md py-1.5 pl-8 pr-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
              {filteredMetals.map((metal) => (
                <button
                  key={metal.id}
                  type="button"
                  onClick={() => {
                    addMetal(metal.id);
                    setIsAddingMetal(false);
                  }}
                  className="w-full text-left p-1.5 hover:bg-slate-100 rounded-md transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded bg-slate-900 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                      {metal.symbol}
                    </span>
                    <span className="text-xs font-medium text-slate-800">
                      {t(metal.id as any) || metal.name}
                    </span>
                  </div>
                  <Plus size={12} className="text-slate-400 group-hover:text-amber-600" />
                </button>
              ))}

              {filteredMetals.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-500">
                  {t("allMetalsAdded")}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddMetalModal;
