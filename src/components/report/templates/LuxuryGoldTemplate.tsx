import React from "react";
import { SharedReportPayload } from "../../../types/report";
import { Sparkles, ShieldCheck, Scale, Award, CheckCircle2 } from "lucide-react";

interface TemplateProps {
  payload: SharedReportPayload;
  checksum: string;
}

export const LuxuryGoldTemplate: React.FC<TemplateProps> = ({ payload, checksum }) => {
  const weightNum = parseFloat(payload.weight) || 0;
  const ratePerGram = payload.marketRate?.ratePerGram || 0;
  const calculatedGoldVal =
    payload.marketRate?.calculatedGoldValue || weightNum * ratePerGram;
  const precision = payload.decimalPrecision === 3 ? 3 : 2;

  return (
    <div className="bg-gradient-to-b from-amber-50/40 via-white to-amber-50/30 text-slate-900 p-6 sm:p-10 rounded-2xl border-4 border-amber-500/30 shadow-2xl max-w-4xl mx-auto font-body print:border-2 print:shadow-none print:p-4 relative overflow-hidden">
      {/* Decorative Golden Corner Accents */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-600 rounded-tl-xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-amber-600 rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-amber-600 rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-amber-600 rounded-br-xl pointer-events-none" />

      {/* Header */}
      <div className="text-center pb-6 mb-6 border-b border-amber-200/80">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-white shadow-md mb-2">
          <Sparkles size={24} className="text-amber-100" />
        </div>
        <h1 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-amber-950">
          {payload.shopName ? `${payload.shopName} Gold Report` : "Fine Gold Report"}
        </h1>
        <p className="text-xs uppercase tracking-widest text-amber-800 font-semibold mt-1">
          Bullion & Purity Analysis
        </p>

        <div className="mt-3 text-xs font-mono text-slate-500">
          Report ID: {payload.reportId || "PRESTIGE-GOLD"}
        </div>
      </div>

      {/* Customer & Specimen Card */}
      <div className="bg-white/80 backdrop-blur-xs rounded-xl border border-amber-200 p-4 sm:p-5 mb-6 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
              Customer
            </div>
            <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
              {payload.customerName || "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
              Jewelry / Lot
            </div>
            <div className="font-bold text-slate-900 text-sm mt-0.5 truncate">
              {payload.sampleType || "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1">
              <Scale size={11} /> Net Weight
            </div>
            <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
              {payload.weight} g
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
              Issuance Date
            </div>
            <div className="font-semibold text-slate-700 text-xs mt-0.5">
              {payload.timestamp}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Purity Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-white rounded-xl p-6 mb-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-100 font-bold mb-1">
            Gold (Au) Concentration
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight drop-shadow-xs">
            {parseFloat(payload.goldPurity).toFixed(precision)}%
          </div>
          <div className="text-xs text-amber-100 mt-1 font-medium">
            Fine gold content determined through precision spectrometry
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur-xs rounded-lg p-4 text-center sm:text-right border border-white/20 w-full sm:w-auto">
          <div className="text-xs uppercase tracking-wider text-amber-100 font-bold">
            Standard Karat
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            {payload.karatDisplay}
          </div>
          <div className="text-[11px] font-mono text-amber-200 mt-0.5">
            Exact: {payload.karatExact} Karat
          </div>
        </div>
      </div>

      {/* IBJA Valuation Banner */}
      {ratePerGram > 0 && (
        <div className="bg-white border-2 border-amber-300/80 rounded-xl p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Award size={13} className="text-amber-600" />
              IBJA Market Reference
            </div>
            <div className="text-slate-600 mt-0.5">
              Gold benchmark for {payload.karatDisplay}:{" "}
              <strong className="text-slate-900 font-mono">
                ₹{ratePerGram.toLocaleString("en-IN")}/g
              </strong>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Total Gold Valuation
            </div>
            <div className="text-xl font-extrabold font-mono text-amber-900">
              ₹
              {calculatedGoldVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full Metal Spectrum Table (Includes All Zeros) */}
      <div className="bg-white rounded-xl border border-amber-200 overflow-hidden mb-6 shadow-xs">
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-amber-950">
            Elemental Composition ({payload.metals.length} Elements)
          </h3>
          <span className="text-[11px] text-amber-800 font-semibold">
            All elements recorded
          </span>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-amber-50/50 text-slate-700 text-[10px] uppercase font-bold border-b border-amber-200">
            <tr>
              <th className="py-2.5 px-4">Constituent</th>
              <th className="py-2.5 px-4">Symbol</th>
              <th className="py-2.5 px-4 text-right">Purity %</th>
              <th className="py-2.5 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100/60">
            {payload.metals.map((metal) => {
              const val = parseFloat(metal.value) || 0;
              const isGold = metal.id === "gold";
              return (
                <tr
                  key={metal.id}
                  className={
                    isGold
                      ? "bg-amber-100/40 font-bold"
                      : val > 0
                      ? "bg-white"
                      : "bg-slate-50/30 text-slate-400"
                  }
                >
                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                    {metal.name}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {metal.symbol}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">
                    {val.toFixed(precision)}%
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {val > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                        <CheckCircle2 size={12} /> Present
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400">
                        {precision === 2 ? "0.00" : "0.000"} (Nil)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>{payload.shopName ? `${payload.shopName} Report` : "Prestige Fine Gold Report"}</div>
        <div className="font-mono text-[10px] text-slate-400">{payload.timestamp}</div>
      </div>
    </div>
  );
};
