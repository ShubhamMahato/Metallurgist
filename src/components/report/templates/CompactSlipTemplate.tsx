import React from "react";
import { SharedReportPayload } from "../../../types/report";
import { ShieldCheck, Receipt } from "lucide-react";

interface TemplateProps {
  payload: SharedReportPayload;
  checksum: string;
}

export const CompactSlipTemplate: React.FC<TemplateProps> = ({ payload, checksum }) => {
  const weightNum = parseFloat(payload.weight) || 0;
  const ratePerGram = payload.marketRate?.ratePerGram || 0;
  const calculatedGoldVal =
    payload.marketRate?.calculatedGoldValue || weightNum * ratePerGram;
  const precision = payload.decimalPrecision === 3 ? 3 : 2;

  return (
    <div className="bg-white text-slate-900 p-5 sm:p-7 rounded-xl border border-dashed border-slate-300 shadow-md max-w-xl mx-auto font-mono text-xs print:border print:shadow-none print:p-2">
      {/* Header */}
      <div className="text-center pb-3 mb-3 border-b border-dashed border-slate-300">
        <div className="inline-flex items-center gap-1 font-bold text-sm uppercase tracking-wider text-slate-900 mb-1">
          <Receipt size={14} className="text-amber-600" />
          <span>{(payload.shopName ? payload.shopName.toUpperCase() : "METALLURGIST")} REPORT SLIP</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Ref: {payload.reportId} • Date: {payload.timestamp}
        </div>
      </div>

      {/* Client Particulars */}
      <div className="space-y-1 pb-3 mb-3 border-b border-dashed border-slate-300 text-slate-700">
        <div className="flex justify-between">
          <span className="text-slate-500">JEWELLER:</span>
          <span className="font-bold text-slate-900">{payload.customerName || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">SAMPLE:</span>
          <span className="font-bold text-slate-900">{payload.sampleType || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">NET WEIGHT:</span>
          <span className="font-bold text-slate-900">{payload.weight} g</span>
        </div>
      </div>

      {/* Gold & Karat Box */}
      <div className="bg-slate-900 text-white rounded p-3 mb-3 text-center">
        <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
          Gold Purity
        </div>
        <div className="text-2xl font-black tracking-tight text-white my-0.5">
          {parseFloat(payload.goldPurity).toFixed(precision)}%
        </div>
        <div className="text-[11px] text-slate-300">
          Rating: <strong className="text-amber-400">{payload.karatDisplay}</strong>{" "}
          (Exact: {payload.karatExact}K)
        </div>
      </div>

      {/* Market Rate if present */}
      {ratePerGram > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2.5 mb-3 text-slate-800 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span>IBJA Rate ({payload.karatDisplay}):</span>
            <span className="font-bold">₹{ratePerGram.toLocaleString("en-IN")}/g</span>
          </div>
          <div className="flex justify-between text-[11px] font-bold text-amber-950 pt-1 border-t border-amber-200">
            <span>Approx Gold Value:</span>
            <span>
              ₹
              {calculatedGoldVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Dense Metals Table */}
      <div className="mb-4">
        <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 flex justify-between">
          <span>Element</span>
          <span>Purity (%)</span>
        </div>
        <div className="divide-y divide-slate-100 border-t border-b border-slate-200">
          {payload.metals.map((metal) => {
            const val = parseFloat(metal.value) || 0;
            return (
              <div
                key={metal.id}
                className={`flex justify-between py-1 text-[11px] ${
                  metal.id === "gold" ? "font-bold text-amber-700 bg-amber-50/50 px-1" : ""
                }`}
              >
                <span>
                  {metal.name} ({metal.symbol})
                </span>
                <span className="font-bold">{val.toFixed(precision)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slip Footer */}
      <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-dashed border-slate-300">
        <div>*** END OF REPORT SLIP ***</div>
      </div>
    </div>
  );
};
