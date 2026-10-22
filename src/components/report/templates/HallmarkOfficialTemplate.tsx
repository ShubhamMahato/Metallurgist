import React from "react";
import { SharedReportPayload } from "../../../types/report";
import { ShieldCheck, Award, FileCheck, CheckCircle2 } from "lucide-react";

interface TemplateProps {
  payload: SharedReportPayload;
  checksum: string;
}

export const HallmarkOfficialTemplate: React.FC<TemplateProps> = ({ payload, checksum }) => {
  const weightNum = parseFloat(payload.weight) || 0;
  const ratePerGram = payload.marketRate?.ratePerGram || 0;
  const calculatedGoldVal =
    payload.marketRate?.calculatedGoldValue || weightNum * ratePerGram;
  const precision = payload.decimalPrecision === 3 ? 3 : 2;

  return (
    <div className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl border-4 border-emerald-900/20 shadow-xl max-w-4xl mx-auto font-body print:border print:shadow-none print:p-4 relative">
      {/* Hallmark Emblem */}
      <div className="border-b-2 border-emerald-900 pb-5 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-bold shadow-md">
              <Award size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">
                {payload.shopName || "Gold Testing Laboratory"}
              </div>
              <h1 className="font-headline text-lg sm:text-xl font-black text-slate-900 uppercase">
                Hallmark Report
              </h1>
              <div className="text-xs text-slate-500 font-mono">
                Regulatory Standard: IS 1417 / Testing Directive
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 text-center min-w-[140px]">
            <div className="text-[10px] uppercase font-bold text-emerald-800">
              Report No.
            </div>
            <div className="font-mono text-sm font-extrabold text-slate-900">
              {payload.reportId || "BIS-HM-916"}
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Inspection Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Gold (Au) Concentration
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-950 block mt-1">
            {parseFloat(payload.goldPurity).toFixed(precision)}%
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            Purity Grade
          </span>
        </div>

        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Standard Karat Grade
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-700 block mt-1">
            {payload.karatDisplay}
          </span>
          <span className="text-[11px] font-mono text-slate-600 block mt-1">
            Exact: {payload.karatExact}K
          </span>
        </div>

        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Gross Net Weight
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 block mt-1">
            {payload.weight} g
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            Precision Analytical Balance
          </span>
        </div>
      </div>

      {/* Customer & Sample Particulars */}
      <div className="border border-slate-200 rounded-xl p-4 mb-6 bg-white shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Customer</span>
            <span className="block font-bold text-slate-900 text-sm mt-0.5 truncate">
              {payload.customerName || "—"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Sample Type</span>
            <span className="block font-bold text-slate-900 text-sm mt-0.5 truncate">
              {payload.sampleType || "—"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Report Date</span>
            <span className="block text-slate-700 text-xs mt-0.5">
              {payload.timestamp}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Valuation</span>
            <span className="block font-mono font-bold text-emerald-800 text-sm mt-0.5">
              {ratePerGram > 0
                ? `₹${calculatedGoldVal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "Market Dependent"}
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Checklist and Metals Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
            <FileCheck size={14} />
            Full Elemental Analysis Ledger ({payload.metals.length} Constituents)
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Precision: 0.001%
          </span>
        </div>

        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-emerald-900 text-white uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2 px-3">Metal</th>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3 text-right">Result (%)</th>
                <th className="py-2 px-3 text-right">Regulatory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payload.metals.map((metal, i) => {
                const val = parseFloat(metal.value) || 0;
                return (
                  <tr
                    key={metal.id}
                    className={
                      metal.id === "gold"
                        ? "bg-amber-50 font-bold"
                        : i % 2 === 0
                        ? "bg-white"
                        : "bg-slate-50"
                    }
                  >
                    <td className="py-2 px-3 font-medium text-slate-900">
                      {metal.name}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {metal.symbol}
                    </td>
                    <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">
                      {val.toFixed(precision)}%
                    </td>
                    <td className="py-2 px-3 text-right">
                      {val > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 size={12} /> Tested
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-mono">
                          {precision === 2 ? "0.00" : "0.000"} (Compliant)
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
      <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="text-[10px] font-mono text-slate-400">{payload.timestamp}</div>
        <div className="font-semibold text-emerald-900 text-[11px] tracking-wider">
          {payload.shopName ? `${payload.shopName} Report` : "Hallmark Report"}
        </div>
      </div>
    </div>
  );
};
