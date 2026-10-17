import React from "react";
import { SharedReportPayload } from "../../../types/report";
import { ShieldCheck, Scale, Award } from "lucide-react";

interface TemplateProps {
  payload: SharedReportPayload;
  checksum: string;
}

export const ModernMinimalTemplate: React.FC<TemplateProps> = ({ payload, checksum }) => {
  const weightNum = parseFloat(payload.weight) || 0;
  const ratePerGram = payload.marketRate?.ratePerGram || 0;
  const calculatedGoldVal =
    payload.marketRate?.calculatedGoldValue || weightNum * ratePerGram;

  return (
    <div className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-lg max-w-4xl mx-auto font-body print:border-none print:shadow-none print:p-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
        <div>
          <div className="inline-block px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-bold uppercase tracking-wider mb-2">
            Analysis Report
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {payload.shopName ? `${payload.shopName} Report` : "Metallurgist Report"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Report Reference: <span className="font-mono font-medium">{payload.reportId}</span>
          </p>
        </div>

        <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto text-xs">
          <span className="text-xs text-slate-500 font-mono">
            {payload.timestamp}
          </span>
        </div>
      </div>

      {/* 2-Column Primary Readout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Gold & Karat Box */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
              Gold Purity (Au)
            </span>
            <div className="text-4xl font-extrabold font-mono tracking-tight mt-1">
              {parseFloat(payload.goldPurity).toFixed(3)}%
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Commercial Karat:</span>
            <span className="text-xl font-bold font-mono text-amber-400">
              {payload.karatDisplay}{" "}
              <span className="text-xs font-normal text-slate-300">
                ({payload.karatExact}K exact)
              </span>
            </span>
          </div>
        </div>

        {/* Specimen & Valuation Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between text-xs space-y-3">
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Jeweller</span>
              <span className="block font-bold text-slate-900 text-sm truncate mt-0.5">
                {payload.customerName || "—"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Sample Type</span>
              <span className="block font-bold text-slate-900 text-sm truncate mt-0.5">
                {payload.sampleType || "—"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Scale size={11} /> Net Weight
              </span>
              <span className="block font-mono font-bold text-slate-900 text-sm mt-0.5">
                {payload.weight} g
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Award size={11} /> Method
              </span>
              <span className="block font-bold text-slate-900 text-sm mt-0.5">
                XRF Spectrometry
              </span>
            </div>
          </div>

          {ratePerGram > 0 && (
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  IBJA Retail Rate
                </span>
                <span className="font-mono font-bold text-slate-800">
                  ₹{ratePerGram.toLocaleString("en-IN")}/g
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Estimated Value
                </span>
                <span className="font-mono text-base font-bold text-emerald-800">
                  ₹
                  {calculatedGoldVal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All Metals Table */}
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center justify-between">
          <span>Elemental Spectrum</span>
          <span className="text-slate-400 font-normal font-mono text-[11px]">
            {payload.metals.length} Elements Monitored
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-4">Metal</th>
                <th className="py-2.5 px-4">Symbol</th>
                <th className="py-2.5 px-4 text-right">Concentration (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payload.metals.map((metal) => {
                const val = parseFloat(metal.value) || 0;
                return (
                  <tr
                    key={metal.id}
                    className={
                      metal.id === "gold"
                        ? "bg-amber-50/70 font-bold"
                        : val > 0
                        ? "bg-white"
                        : "text-slate-400"
                    }
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {metal.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {metal.symbol}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">
                      {val.toFixed(3)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 font-mono">
        <span>{payload.shopName ? `${payload.shopName} Report` : "Metallurgist Report"}</span>
        <span>{payload.timestamp}</span>
      </div>
    </div>
  );
};
