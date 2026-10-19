import React from "react";
import { SharedReportPayload } from "../../../types/report";
import { Activity, ShieldCheck, Cpu, HardDrive } from "lucide-react";

interface TemplateProps {
  payload: SharedReportPayload;
  checksum: string;
}

export const TechnicalSpectrumTemplate: React.FC<TemplateProps> = ({ payload, checksum }) => {
  const weightNum = parseFloat(payload.weight) || 0;
  const ratePerGram = payload.marketRate?.ratePerGram || 0;
  const calculatedGoldVal =
    payload.marketRate?.calculatedGoldValue || weightNum * ratePerGram;
  const precision = payload.decimalPrecision === 3 ? 3 : 2;

  return (
    <div className="bg-slate-950 text-slate-100 p-6 sm:p-10 rounded-2xl border border-cyan-500/30 shadow-2xl max-w-4xl mx-auto font-body print:bg-white print:text-slate-900 print:border print:p-4">
      {/* Dark Technical Header */}
      <div className="border-b border-cyan-900/60 pb-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase mb-1">
            <Cpu size={14} />
            <span>XRF Spectrometry Diagnostic</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white uppercase">
            {payload.shopName ? `${payload.shopName} Spectrum` : "Elemental Diagnostic Spectrum"}
          </h1>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            DEVICE: XRF-PRO 8000 • CHANNELS: 24 • RES: 0.001%
          </div>
        </div>

        <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto text-xs">
          <span className="text-[11px] text-cyan-400 font-mono">
            {payload.timestamp}
          </span>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 mb-6 text-xs font-mono">
        <div>
          <span className="text-[10px] text-cyan-500 uppercase block">JEWELLER</span>
          <span className="font-bold text-white truncate block mt-0.5">
            {payload.customerName || "—"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-cyan-500 uppercase block">SAMPLE ID</span>
          <span className="font-bold text-white truncate block mt-0.5">
            {payload.sampleType || "—"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-cyan-500 uppercase block">NET MASS</span>
          <span className="font-bold text-white block mt-0.5">
            {payload.weight} g
          </span>
        </div>
        <div>
          <span className="text-[10px] text-cyan-500 uppercase block">VALUATION</span>
          <span className="font-bold text-cyan-300 block mt-0.5">
            {ratePerGram > 0
              ? `₹${calculatedGoldVal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "N/A"}
          </span>
        </div>
      </div>

      {/* Primary Spectrum Diagnostics Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-855 to-slate-900 border border-cyan-500/40 rounded-xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider mb-1">
            <Activity size={14} />
            <span>Target Gold Concentration (Au)</span>
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-xs">
            {parseFloat(payload.goldPurity).toFixed(precision)}%
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Formula Value: ((Purity × 24) / 100) = {payload.karatExact}K
          </div>
        </div>

        <div className="bg-cyan-950/40 border border-cyan-800/80 rounded-xl p-4 text-center sm:text-right min-w-[160px]">
          <span className="text-[10px] uppercase font-mono text-cyan-400 block font-bold">
            Calculated Rating
          </span>
          <span className="text-3xl font-black font-mono text-cyan-200 block">
            {payload.karatDisplay}
          </span>
          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
            Exact: {payload.karatExact}K
          </span>
        </div>
      </div>

      {/* Visual Spectral Bars Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 text-xs font-mono">
          <span className="text-slate-300 uppercase font-bold tracking-wider">
            Spectrometric Spectrum ({payload.metals.length} Channels)
          </span>
          <span className="text-cyan-400 text-[11px]">Channels 1 - {payload.metals.length}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 text-xs font-mono">
          {payload.metals.map((metal) => {
            const val = parseFloat(metal.value) || 0;
            const barWidth = Math.min(100, Math.max(0, val));
            const isGold = metal.id === "gold";

            return (
              <div
                key={metal.id}
                className={`p-2.5 flex items-center justify-between gap-3 ${
                  isGold ? "bg-amber-500/10" : ""
                }`}
              >
                <div className="w-28 sm:w-36 shrink-0 flex items-center gap-2">
                  <span
                    className={`font-bold ${
                      isGold ? "text-amber-400" : val > 0 ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {metal.name}
                  </span>
                  <span className="text-slate-500 text-[10px]">({metal.symbol})</span>
                </div>

                <div className="flex-1 max-w-xs sm:max-w-md h-2 rounded bg-slate-800 overflow-hidden hidden sm:block">
                  <div
                    style={{ width: `${barWidth}%` }}
                    className={`h-full ${
                      isGold
                        ? "bg-amber-400"
                        : val > 0
                        ? "bg-cyan-400"
                        : "bg-transparent"
                    }`}
                  />
                </div>

                <div className="text-right shrink-0 min-w-[70px]">
                  <span
                    className={`font-bold ${
                      isGold ? "text-amber-300 text-sm" : val > 0 ? "text-cyan-200" : "text-slate-500"
                    }`}
                  >
                    {val.toFixed(precision)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Footer */}
      <div className="pt-4 border-t border-cyan-900/60 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
        <span>{payload.shopName ? `${payload.shopName.toUpperCase()} SPECTRUM REPORT` : "XRF SPECTROMETRY REPORT"}</span>
        <span>{payload.timestamp}</span>
      </div>
    </div>
  );
};
