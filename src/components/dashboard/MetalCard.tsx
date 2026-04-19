import React from "react";
import {
  Lock,
  LockOpen,
  X,
  Coins,
  Zap,
  Gem,
} from "lucide-react";
import { motion } from "motion/react";
import { MetalValue } from "../../types/dashboard";

interface MetalCardProps {
  metal: MetalValue;
  lastEditedId: string | null;
  tempValues: Record<string, string>;
  handleValueChange: (id: string, value: string) => void;
  handleValueBlur: (id: string) => void;
  toggleLock: (id: string) => void;
  removeMetal: (id: string) => void;
}

export const MetalCard: React.FC<MetalCardProps> = ({
  metal,
  lastEditedId,
  tempValues,
  handleValueChange,
  handleValueBlur,
  toggleLock,
  removeMetal,
}) => {
  return (
    <motion.div
      layout
      key={metal.id}
      title={`${metal.name} (${metal.symbol}): ${metal.value}%`}
      className={`flex flex-col p-5 rounded-2xl border-2 transition-all relative group/card overflow-hidden ${
        lastEditedId === metal.id
          ? "border-primary/60 ring-4 ring-primary/5 scale-[1.02] shadow-lg"
          : "border-outline-variant/40 hover:border-primary/40 shadow-sm hover:shadow-md"
      }`}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, ${metal.color
          .replace("bg-", "rgba(var(--color-")
          .replace("-50", "-rgb),0.05)")} 100%)`,
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white/10 -mr-12 -mt-12 rounded-full blur-xl group-hover/card:scale-110 transition-transform duration-700"></div>

      <div className="flex items-center gap-3 relative z-10 mb-3">
        <div
          className={`w-10 h-10 rounded-lg ${metal.color} flex items-center justify-center ${metal.textColor} font-mono font-black text-sm border border-white/20 group-hover:rotate-2 transition-transform relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50"></div>
          {metal.symbol.toUpperCase() === "AU" ? (
            <Coins
              size={16}
              className="absolute opacity-10 -right-1 -bottom-1 rotate-12"
            />
          ) : metal.symbol.toUpperCase() === "AG" ? (
            <Coins
              size={16}
              className="absolute opacity-10 -right-1 -bottom-1 rotate-12"
            />
          ) : metal.symbol.toUpperCase() === "CU" ? (
            <Zap
              size={16}
              className="absolute opacity-10 -right-1 -bottom-1 rotate-12"
            />
          ) : (
            <Gem
              size={16}
              className="absolute opacity-10 -right-1 -bottom-1 rotate-12"
            />
          )}
          <span className="relative z-10">{metal.symbol}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <label className="text-[9px] font-black text-outline uppercase tracking-wider truncate block">
              {metal.name}
            </label>
            {metal.locked && <Lock size={7} className="text-secondary" />}
          </div>
          <div className="relative flex items-center group/input">
            <input
              className="w-full bg-transparent border-0 focus:ring-0 font-mono text-xl font-black text-on-surface p-0 tracking-tighter"
              type="text"
              title={`Edit concentration of ${metal.name}`}
              value={tempValues[metal.id] ?? metal.value}
              onChange={(e) => handleValueChange(metal.id, e.target.value)}
              onBlur={() => handleValueBlur(metal.id)}
              disabled={metal.locked}
            />
            <span className="text-outline-variant font-mono font-black text-sm opacity-40">
              %
            </span>
          </div>
        </div>
        <button
          onClick={() => toggleLock(metal.id)}
          title={
            metal.locked
              ? "Unlock to allow rebalancing"
              : "Lock to prevent changes during rebalancing"
          }
          className={`p-1.5 rounded-lg transition-all ${
            metal.locked
              ? "bg-secondary-container/30 text-secondary"
              : "text-outline-variant hover:text-primary hover:bg-primary-container/20"
          }`}
        >
          {metal.locked ? (
            <Lock size={14} fill="currentColor" />
          ) : (
            <LockOpen size={14} />
          )}
        </button>
        {metal.isManual && (
          <button
            onClick={() => removeMetal(metal.id)}
            className="p-1.5 rounded-lg text-outline-variant hover:text-red-500 hover:bg-red-50 transition-all"
            title="Remove constituent"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {metal.history && metal.history.length > 0 && (
        <div className="mt-auto pt-4 border-t border-black/5">
          <div className="text-[10px] font-mono space-y-1">
            {metal.history.map((h, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-x-2 leading-tight"
              >
                <span className="text-slate-500">
                  {h.from.toFixed(3)} → {h.to.toFixed(3)}
                </span>

                <span
                  className={`font-bold ${
                    h.delta > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ({h.delta > 0 ? "+" : ""}
                  {h.delta.toFixed(3)}, {h.percent > 0 ? "+" : ""}
                  {h.percent.toFixed(2)}%)
                </span>

                <span className="text-blue-500 font-bold">via {h.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
