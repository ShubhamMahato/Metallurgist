import React, { useState, useMemo, useId, useEffect } from "react";
import {
  Scale,
  Percent,
  IndianRupee,
  Receipt,
  HelpCircle,
  ArrowRightLeft,
  RefreshCw,
  Award,
} from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import { TopNav } from "../../components/common/TopNav";
import { Tooltip } from "../../components/common/Tooltip";

type KaratOption = "22K" | "24K" | "18K";

interface KaratRateData {
  perGram: number;
  per10Gram: number;
  close: number;
  changePct?: number;
}

const DEFAULT_RATES: Record<KaratOption, KaratRateData> = {
  "22K": { perGram: 13685, per10Gram: 136850, close: 13685 },
  "24K": { perGram: 14929, per10Gram: 149290, close: 14929 },
  "18K": { perGram: 11197, per10Gram: 111970, close: 11197 },
};

export default function PriceCalculator() {
  const { t } = useLanguage();

  // Selected Karat: 22K by default
  const [selectedKarat, setSelectedKarat] = useState<KaratOption>("22K");

  // Inputs
  const [weight, setWeight] = useState<string>("10.000");
  const [rateType, setRateType] = useState<"gram" | "10gram">("10gram");
  const [rate, setRate] = useState<string>("136850"); // default 22K 10g rate
  const [makingType, setMakingType] = useState<"percent" | "amount">("percent");
  const [makingValue, setMakingValue] = useState<string>("12");

  // Taxes: default to "unified" (3%) as requested
  const [gstType, setGstType] = useState<"unified" | "split">("unified");

  // Live Rates from SnapData / IBJA
  const [liveKaratRates, setLiveKaratRates] =
    useState<Record<KaratOption, KaratRateData>>(DEFAULT_RATES);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const weightId = useId();
  const rateId = useId();
  const makingId = useId();

  // Fetch official retail gold rates from snapdata.dev
  const fetchLiveRates = async () => {
    setIsLoadingLive(true);
    try {
      const response = await fetch(
        "https://snapdata.dev/api/v1/gold/in/latest.json"
      );
      if (!response.ok) throw new Error("Failed to fetch IBJA retail rate");
      const data = await response.json();

      const observations: any[] = data.observations || [];
      const newRates: Record<KaratOption, KaratRateData> = { ...DEFAULT_RATES };

      for (const obs of observations) {
        const val = typeof obs.value === "number" ? obs.value : parseFloat(obs.value);
        if (isNaN(val) || val <= 0) continue;

        if (obs.instrument === "XAU.22K" || obs.instrument_id?.includes("22K")) {
          newRates["22K"] = {
            perGram: val,
            per10Gram: val * 10,
            close: obs.close ?? val,
            changePct: obs.change_pct,
          };
        } else if (obs.instrument === "XAU.24K" || obs.instrument_id?.includes("24K")) {
          newRates["24K"] = {
            perGram: val,
            per10Gram: val * 10,
            close: obs.close ?? val,
            changePct: obs.change_pct,
          };
        } else if (obs.instrument === "XAU.18K" || obs.instrument_id?.includes("18K")) {
          newRates["18K"] = {
            perGram: val,
            per10Gram: val * 10,
            close: obs.close ?? val,
            changePct: obs.change_pct,
          };
        }
      }

      setLiveKaratRates(newRates);
      setLastUpdated(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );

      // Automatically update the rate field based on currently selected karat and rateType
      const activeData = newRates[selectedKarat];
      if (activeData) {
        setRate(
          String(rateType === "10gram" ? activeData.per10Gram : activeData.perGram)
        );
      }
    } catch (err) {
      console.warn("Could not fetch IBJA retail rate from snapdata.dev:", err);
    } finally {
      setIsLoadingLive(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchLiveRates();
  }, []);

  // When user selects a Karat option (22K, 24K, 18K)
  const handleKaratChange = (newKarat: KaratOption) => {
    setSelectedKarat(newKarat);
    const targetData = liveKaratRates[newKarat] || DEFAULT_RATES[newKarat];
    if (targetData) {
      setRate(
        String(rateType === "10gram" ? targetData.per10Gram : targetData.perGram)
      );
    }
  };

  // When user changes rateType between 10g and 1g
  const handleRateTypeChange = (newType: "gram" | "10gram") => {
    if (newType === rateType) return;
    setRateType(newType);
    const targetData = liveKaratRates[selectedKarat] || DEFAULT_RATES[selectedKarat];

    if (targetData) {
      setRate(
        String(newType === "10gram" ? targetData.per10Gram : targetData.perGram)
      );
    } else {
      const num = parseFloat(rate);
      if (!isNaN(num) && num > 0) {
        setRate(newType === "gram" ? (num / 10).toFixed(0) : (num * 10).toFixed(0));
      }
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    const w = parseFloat(weight) || 0;
    const r = parseFloat(rate) || 0;
    const mv = parseFloat(makingValue) || 0;

    const actualRatePerGram = rateType === "10gram" ? r / 10 : r;
    const goldValue = w * actualRatePerGram;

    let makingAmount = 0;
    let makingPercent = 0;

    if (makingType === "percent") {
      makingPercent = mv;
      makingAmount = goldValue * (mv / 100);
    } else {
      makingAmount = mv;
      makingPercent = goldValue > 0 ? (mv / goldValue) * 100 : 0;
    }

    const subtotal = goldValue + makingAmount;

    let goldGst = 0;
    let makingGst = 0;
    let totalGst = 0;

    if (gstType === "split") {
      goldGst = goldValue * 0.03;
      makingGst = makingAmount * 0.05;
      totalGst = goldGst + makingGst;
    } else {
      totalGst = subtotal * 0.03;
    }

    const finalTotal = subtotal + totalGst;

    return {
      actualRatePerGram: actualRatePerGram.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      goldValue: goldValue.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      makingAmount: makingAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      makingPercent: makingPercent.toFixed(2),
      subtotal: subtotal.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      goldGst: goldGst.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      makingGst: makingGst.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      totalGst: totalGst.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      finalTotal: finalTotal.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [weight, rate, rateType, makingType, makingValue, gstType]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-body flex flex-col selection:bg-amber-200">
      <TopNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Minimal Clean Header */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t("priceBreakup")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              {t("priceSubtitle")}
            </p>
          </div>
        </section>

        {/* 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Inputs Column */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-100">
              {t("sampleDetails")}
            </h2>

            {/* Weight Input */}
            <div className="space-y-1">
              <label
                htmlFor={weightId}
                className="text-xs font-semibold text-slate-700 uppercase tracking-wider block"
              >
                {t("weight")}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400 pointer-events-none">
                  <Scale size={15} />
                </div>
                <input
                  id={weightId}
                  type="number"
                  step="0.001"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0.000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-9 pr-14 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
                <span className="absolute right-3 text-xs font-mono font-bold text-slate-400">
                  g
                </span>
              </div>
            </div>

            {/* Gold Karat Selector (Clean 3-button selector, top dropdown removed as requested) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Award size={14} className="text-amber-600" />
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    {t("selectKarat")}
                  </label>
                </div>

                {/* Refresh Live Rates from IBJA */}
                <button
                  type="button"
                  onClick={fetchLiveRates}
                  disabled={isLoadingLive}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors disabled:opacity-60"
                  title="Fetch official IBJA retail benchmark rates in INR"
                >
                  <RefreshCw
                    size={11}
                    className={isLoadingLive ? "animate-spin" : ""}
                  />
                  <span>
                    {isLoadingLive ? t("fetchingRate") : t("fetchLiveRate")}
                  </span>
                </button>
              </div>

              {/* Karat Button Selector: 22K (default), 24K, 18K */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleKaratChange("22K")}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    selectedKarat === "22K"
                      ? "bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-300"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">22K (916)</div>
                  <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                    ₹{liveKaratRates["22K"].perGram}/g
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleKaratChange("24K")}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    selectedKarat === "24K"
                      ? "bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-300"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">24K (999)</div>
                  <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                    ₹{liveKaratRates["24K"].perGram}/g
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleKaratChange("18K")}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    selectedKarat === "18K"
                      ? "bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-300"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">18K (750)</div>
                  <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                    ₹{liveKaratRates["18K"].perGram}/g
                  </div>
                </button>
              </div>

              {lastUpdated && (
                <div className="text-[10px] text-slate-400 text-right pr-0.5">
                  IBJA live benchmark · {lastUpdated}
                </div>
              )}
            </div>

            {/* Rate Quotation Units (Per 10g / Per 1g) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                {t("goldRate")} ({selectedKarat})
              </label>

              <div
                role="radiogroup"
                aria-label={t("goldRate")}
                className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={rateType === "10gram"}
                  onClick={() => handleRateTypeChange("10gram")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    rateType === "10gram"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {t("per10Gram")}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={rateType === "gram"}
                  onClick={() => handleRateTypeChange("gram")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    rateType === "gram"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {t("perGram")}
                </button>
              </div>
            </div>

            {/* Gold Rate Text Field (Holds the value directly) */}
            <div className="space-y-1">
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400 pointer-events-none">
                  <IndianRupee size={15} />
                </div>
                <input
                  id={rateId}
                  type="number"
                  step="1"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 136850"
                  aria-label={t("goldRate")}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-9 pr-24 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
                <span className="absolute right-3 text-xs font-mono font-medium text-slate-500">
                  / {rateType === "10gram" ? "10g" : "1g"}
                </span>
              </div>
            </div>

            {/* Making Charges */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={makingId}
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wider block"
                >
                  {t("makingCharges")}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setMakingType(makingType === "percent" ? "amount" : "percent")
                  }
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRightLeft size={11} />
                  <span>
                    {makingType === "percent"
                      ? t("switchToAmount")
                      : t("switchToPercent")}
                  </span>
                </button>
              </div>

              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400 pointer-events-none">
                  {makingType === "percent" ? (
                    <Percent size={15} />
                  ) : (
                    <IndianRupee size={15} />
                  )}
                </div>
                <input
                  id={makingId}
                  type="number"
                  step={makingType === "percent" ? "0.1" : "1"}
                  min="0"
                  value={makingValue}
                  onChange={(e) => setMakingValue(e.target.value)}
                  placeholder="0"
                  aria-label={t("makingCharges")}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-9 pr-24 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
                <span className="absolute right-3 text-xs font-mono font-bold text-slate-600">
                  {makingType === "percent"
                    ? `≈ ₹${calculations.makingAmount}`
                    : `≈ ${calculations.makingPercent}%`}
                </span>
              </div>
            </div>

            {/* GST Tax Options: Unified 3% first & default, with clear explanation below */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  {t("taxes")}
                </label>
                <Tooltip content={t("unifiedTaxExplanation")}>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    aria-label="Tax schedule info"
                  >
                    <HelpCircle size={11} />
                  </button>
                </Tooltip>
              </div>

              {/* Reordered: Unified 3% first, Split 3% + 5% second */}
              <div
                role="radiogroup"
                aria-label={t("taxes")}
                className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={gstType === "unified"}
                  onClick={() => setGstType("unified")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    gstType === "unified"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {t("unifiedTax")}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={gstType === "split"}
                  onClick={() => setGstType("split")}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    gstType === "split"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {t("splitTax")}
                </button>
              </div>

              {/* Informative text below taxes explaining what Split and Unified mean */}
              <div className="text-[11px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5 mt-2">
                <div
                  className={`p-1 rounded ${
                    gstType === "unified"
                      ? "bg-slate-200/70 text-slate-900 font-medium"
                      : "text-slate-600"
                  }`}
                >
                  <span className="font-bold text-slate-900 mr-1">
                    {t("unifiedTax")}:
                  </span>
                  <span>{t("unifiedTaxExplanation")}</span>
                </div>
                <div
                  className={`p-1 rounded border-t border-slate-200 pt-1.5 ${
                    gstType === "split"
                      ? "bg-slate-200/70 text-slate-900 font-medium"
                      : "text-slate-600"
                  }`}
                >
                  <span className="font-bold text-slate-900 mr-1">
                    {t("splitTax")}:
                  </span>
                  <span>{t("splitTaxExplanation")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Column */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt size={18} className="text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  {t("priceBreakup")} ({selectedKarat})
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500">
                ₹{calculations.actualRatePerGram}/g
              </span>
            </div>

            {/* Step Rows */}
            <div className="p-4 sm:p-5 space-y-3.5 flex-1">
              {/* Step 1: Base Gold */}
              <div className="flex items-start justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    {t("baseGoldValue")} ({selectedKarat})
                  </span>
                  <p className="text-xs text-slate-500 font-mono">
                    {weight || "0"}g × ₹{calculations.actualRatePerGram}/g
                  </p>
                </div>
                <span className="text-base font-bold font-mono text-slate-900">
                  ₹{calculations.goldValue}
                </span>
              </div>

              {/* Step 2: Making Charges */}
              <div className="flex items-start justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {t("makingCharges")}
                    </span>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                      {calculations.makingPercent}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {makingType === "percent"
                      ? `${calculations.makingPercent}%`
                      : `Fixed`}
                  </p>
                </div>
                <span className="text-base font-bold font-mono text-slate-900">
                  ₹{calculations.makingAmount}
                </span>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-md border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t("subtotal")}
                </span>
                <span className="text-base font-bold font-mono text-slate-900">
                  ₹{calculations.subtotal}
                </span>
              </div>

              {/* Step 3: Taxes (Unified is default) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  {t("taxes")} ({gstType === "unified" ? "Unified 3%" : "Split 3%+5%"})
                </span>

                {gstType === "unified" ? (
                  <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-700">
                        Unified GST @ 3% (Subtotal)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Applied on ₹{calculations.subtotal}
                      </span>
                    </div>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      ₹{calculations.totalGst}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        GST 3% (Gold)
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        ₹{calculations.goldGst}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        GST 5% (Making)
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        ₹{calculations.makingGst}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Total Footer Banner */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white border-t border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                    {t("finalTotal")}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Net payable ({selectedKarat})
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                    ₹{calculations.finalTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
