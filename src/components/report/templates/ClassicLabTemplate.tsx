import React from "react";
import { SharedReportPayload } from "../../../types/report";
import { Award, ShieldCheck, Scale, Calendar, User, FlaskConical } from "lucide-react";

interface TemplateProps {
  payload: SharedReportPayload;
  checksum: string;
}

export const ClassicLabTemplate: React.FC<TemplateProps> = ({ payload, checksum }) => {
  const weightNum = parseFloat(payload.weight) || 0;
  const ratePerGram = payload.marketRate?.ratePerGram || 0;
  const calculatedGoldVal =
    payload.marketRate?.calculatedGoldValue || weightNum * ratePerGram;

  return (
    <div className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl border-2 border-slate-800 shadow-xl max-w-4xl mx-auto font-body print:border print:shadow-none print:p-4">
      {/* Top Formal Header */}
      <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center relative">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2 text-left">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <FlaskConical size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="font-headline font-extrabold text-base sm:text-lg tracking-tight uppercase">
                {payload.shopName || "Metallurgist Laboratories"}
              </div>
              <div className="text-[11px] text-slate-500 font-mono tracking-wider">
                METALLURGICAL ANALYSIS REPORT
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Report #</div>
            <div className="font-mono text-xs sm:text-sm font-bold text-slate-900">
              {payload.reportId || "ML-LAB-REP"}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
              <Calendar size={10} />
              <span>{payload.timestamp}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sample & Jeweller Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
            <User size={11} /> Jeweller Name
          </span>
          <span className="font-bold text-slate-900 block mt-1 text-sm truncate">
            {payload.customerName || "—"}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
            <FlaskConical size={11} /> Sample Type
          </span>
          <span className="font-bold text-slate-900 block mt-1 text-sm truncate">
            {payload.sampleType || "—"}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
            <Scale size={11} /> Sample Weight
          </span>
          <span className="font-mono font-bold text-slate-900 block mt-1 text-sm">
            {payload.weight} g
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
            <Award size={11} /> Standard
          </span>
          <span className="font-bold text-slate-900 block mt-1 text-sm text-slate-700">
            Fischer XRF Std
          </span>
        </div>
      </div>

      {/* Primary Gold & Karat Rating Callout */}
      <div className="border-2 border-slate-900 rounded-xl p-5 mb-6 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-1">
            Gold Purity (Au)
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
            {parseFloat(payload.goldPurity).toFixed(3)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Elemental concentration determined by spectrometric analysis
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">
              Commercial Karat
            </span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
              {payload.karatDisplay}
            </span>
          </div>
          <div className="text-right sm:mt-1">
            <span className="text-[11px] text-slate-300 font-mono bg-white/10 px-2 py-0.5 rounded">
              Exact: {payload.karatExact}K
            </span>
          </div>
        </div>
      </div>

      {/* IBJA Live Gold Valuation Readout */}
      {ratePerGram > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px] block">
              Market Valuation (IBJA Reference)
            </span>
            <span className="text-slate-600">
              Rate for {payload.karatDisplay}:{" "}
              <strong className="text-slate-900 font-mono">
                ₹{ratePerGram.toLocaleString("en-IN")}/g
              </strong>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">
              Calculated Gold Value ({payload.weight}g):
            </span>
            <span className="text-lg font-bold font-mono text-amber-900">
              ₹
              {calculatedGoldVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Complete Constituent Table (Includes all metals and zero values) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Complete Elemental Spectrometry ({payload.metals.length} Elements)
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Precision: 0.001%
          </span>
        </div>

        <div className="border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2 px-3">Element / Constituent</th>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3 text-right">Concentration (%)</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payload.metals.map((metal, idx) => {
                const valNum = parseFloat(metal.value) || 0;
                const isGold = metal.id === "gold";
                const isNonZero = valNum > 0;

                return (
                  <tr
                    key={metal.id}
                    className={
                      isGold
                        ? "bg-amber-50/60 font-bold"
                        : idx % 2 === 0
                        ? "bg-white"
                        : "bg-slate-50/50"
                    }
                  >
                    <td className="py-2 px-3 font-medium text-slate-900">
                      {metal.name}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {metal.symbol}
                    </td>
                    <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">
                      {valNum.toFixed(3)}%
                    </td>
                    <td className="py-2 px-3 text-right">
                      {isNonZero ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-800">
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-mono">
                          0.000 (Trace)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px] text-slate-500">
        <div>{payload.shopName ? `${payload.shopName} Report` : "Metallurgist Laboratory Report"}</div>
        <div className="font-mono text-[10px] text-slate-400">{payload.timestamp}</div>
      </div>
    </div>
  );
};
