import React from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AvailableMetal, MetalValue } from "../../types/dashboard";

interface AddMetalModalProps {
  isAddingMetal: boolean;
  setIsAddingMetal: (isAdding: boolean) => void;
  addMetalRef: React.RefObject<HTMLDivElement>;
  availableMetals: AvailableMetal[];
  metals: MetalValue[];
  addMetal: (id: string) => void;
}

export const AddMetalModal: React.FC<AddMetalModalProps> = ({
  isAddingMetal,
  setIsAddingMetal,
  addMetalRef,
  availableMetals,
  metals,
  addMetal,
}) => {
  const filteredMetals = availableMetals.filter((m) => {
    const existing = metals.find((x) => x.id === m.id);
    if (!existing) return true;

    // A metal is "on screen" if it has a baseline, a positive value, or is manual
    const isOnScreen =
      (existing.baseline ?? 0) > 0 ||
      parseFloat(existing.value) > 0 ||
      existing.isManual;
    return !isOnScreen;
  });

  return (
    <div className="relative" ref={addMetalRef}>
      <button
        onClick={() => setIsAddingMetal(!isAddingMetal)}
        title="Add a new metal constituent to the report"
        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer p-3 -m-3 bg-white/5 rounded-lg border border-transparent hover:border-primary/20 transition-all"
      >
        <Plus size={12} />
        Add Constituent
      </button>

      <AnimatePresence>
        {isAddingMetal && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:top-full mt-4 w-[calc(100%-2rem)] sm:w-64 max-w-sm bg-white rounded-2xl shadow-2xl border border-black/5 p-2 z-[100] max-h-[80vh] sm:max-h-[400px] overflow-y-auto custom-scrollbar"
          >
            <div className="p-2 text-[10px] font-black text-outline uppercase tracking-widest border-b border-black/5 mb-1">
              Select Metal to Add
            </div>
            {filteredMetals.map((metal) => (
              <button
                key={metal.id}
                onClick={() => {
                  addMetal(metal.id);
                  setIsAddingMetal(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {metal.symbol}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {metal.name}
                  </span>
                </div>
                <Plus
                  size={12}
                  className="text-slate-300 group-hover:text-primary transition-colors"
                />
              </button>
            ))}
            {filteredMetals.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">
                All metals already added
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
