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
  Tag,
  X,
  RotateCcw,
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

  // Core Inputs
  const [weight, setWeight] = useState<string>("10.000");
  const [rateType, setRateType] = useState<"gram" | "10gram">("10gram");
  const [rate, setRate] = useState<string>("136850"); // default 22K 10g rate
  const [makingType, setMakingType] = useState<"percent" | "amount">("percent");
  const [makingValue, setMakingValue] = useState<string>("12");

  // Discount on Making Charges (hidden by default, revealed on toggle)
  const [showDiscount, setShowDiscount] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState<string>("10");

  // Taxes: default to "unified" (3%)
  const [gstType, setGstType] = useState<"unified" | "split">("unified");

  // Live Rates from SnapData / IBJA
  const [liveKaratRates, setLiveKaratRates] =
    useState<Record<KaratOption, KaratRateData>>(DEFAULT_RATES);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const weightId = useId();
  const rateId = useId();
  const makingId = useId();
  const discountId = useId();

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

  // Reset calculator to standard initial defaults
  const handleResetCalculator = () => {
    setSelectedKarat("22K");
    setWeight("10.000");
    setRateType("10gram");
    const k22 = liveKaratRates["22K"] || DEFAULT_RATES["22K"];
    setRate(String(k22.per10Gram));
    setMakingType("percent");
    setMakingValue("12");
    setShowDiscount(false);
    setDiscountType("percent");
    setDiscountValue("10");
    setGstType("unified");
  };

  // Calculations
  const calculations = useMemo(() => {
    const w = parseFloat(weight) || 0;
    const r = parseFloat(rate) || 0;
    const mv = parseFloat(makingValue) || 0;
    const dv = showDiscount ? (parseFloat(discountValue) || 0) : 0;

    const actualRatePerGram = rateType === "10gram" ? r / 10 : r;
    const goldValue = w * actualRatePerGram;

    let originalMakingAmount = 0;
    let makingPercent = 0;

    if (makingType === "percent") {
      makingPercent = mv;
      originalMakingAmount = goldValue * (mv / 100);
    } else {
      originalMakingAmount = mv;
      makingPercent = goldValue > 0 ? (mv / goldValue) * 100 : 0;
    }

    let discountAmount = 0;
    if (showDiscount && dv > 0) {
      if (discountType === "percent") {
        discountAmount = (originalMakingAmount * Math.min(100, dv)) / 100;
      } else {
        discountAmount = Math.min(originalMakingAmount, dv);
      }
    }

    const netMakingAmount = Math.max(0, originalMakingAmount - discountAmount);
    const subtotal = goldValue + netMakingAmount;

    let goldGst = 0;
    let makingGst = 0;
    let totalGst = 0;

    if (gstType === "split") {
      goldGst = goldValue * 0.03;
      makingGst = netMakingAmount * 0.05;
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
      originalMakingAmount: originalMakingAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      discountAmount: discountAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      netMakingAmount: netMakingAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      hasDiscount: showDiscount && discountAmount > 0,
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
  }, [
    weight,
    rate,
    rateType,
    makingType,
    makingValue,
    gstType,
    showDiscount,
    discountType,
    discountValue,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-body flex flex-col selection:bg-amber-200 w-full max-w-full overflow-x-hidden">
      <TopNav />

      {/* Main Workspace - Top banner removed to keep calculator compact and scroll-free on desktop */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
          {/* Inputs Column (Sample Details) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
            {/* Header with Title and Reset Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {t("sampleDetails")}
                </h2>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                  {selectedKarat}
                </span>
              </div>

              <button
                type="button"
                onClick={handleResetCalculator}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                title={t("resetBaseline")}
              >
                <RotateCcw size={11} />
                <span>{t("resetBaseline")}</span>
              </button>
            </div>

            {/* Row 1: Weight & Karat Selector in clean compact layout */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Weight Input (4 cols on tablet/desktop) */}
              <div className="sm:col-span-5 space-y-1">
                <label
                  htmlFor={weightId}
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wider block"
                >
                  {t("weight")}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 text-slate-400 pointer-events-none">
                    <Scale size={14} />
                  </div>
                  <input
                    id={weightId}
                    type="number"
                    step="0.001"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-8 pr-7 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-2 text-xs font-mono font-bold text-slate-400">
                    g
                  </span>
                </div>
              </div>

              {/* Karat Button Selector: 22K (default), 24K, 18K (7 cols on tablet/desktop) */}
              <div className="sm:col-span-7 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    {t("selectKarat")}
                  </label>
                  <button
                    type="button"
                    onClick={fetchLiveRates}
                    disabled={isLoadingLive}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer disabled:opacity-60"
                    title="Refresh live retail IBJA rates"
                  >
                    <RefreshCw
                      size={10}
                      className={isLoadingLive ? "animate-spin" : ""}
                    />
                    <span>{isLoadingLive ? "..." : "IBJA"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {(["22K", "24K", "18K"] as KaratOption[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleKaratChange(k)}
                      className={`py-1 px-1.5 rounded-md border text-center transition-all cursor-pointer ${
                        selectedKarat === k
                          ? "bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-300"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-none">
                        {k}
                      </div>
                      <div className="text-[9px] font-mono text-slate-600 mt-0.5 truncate">
                        ₹{liveKaratRates[k]?.perGram ?? DEFAULT_RATES[k].perGram}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Gold Rate with integrated 10g / 1g toggle */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={rateId}
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wider block"
                >
                  {t("goldRate")} ({selectedKarat})
                </label>
                {lastUpdated && (
                  <span className="text-[10px] text-slate-400">
                    Live · {lastUpdated}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 flex items-center">
                  <div className="absolute left-2.5 text-slate-400 pointer-events-none">
                    <IndianRupee size={14} />
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-8 pr-16 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-2.5 text-xs font-mono font-medium text-slate-500">
                    / {rateType === "10gram" ? "10g" : "1g"}
                  </span>
                </div>

                {/* Compact Segmented Switch for 10g vs 1g */}
                <div className="flex items-center bg-slate-100 border border-slate-300 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRateTypeChange("10gram")}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      rateType === "10gram"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    10g
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRateTypeChange("gram")}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      rateType === "gram"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    1g
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Making Charges + Discount Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={makingId}
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wider block"
                >
                  {t("makingCharges")}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMakingType(makingType === "percent" ? "amount" : "percent")
                    }
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRightLeft size={10} />
                    <span>
                      {makingType === "percent"
                        ? t("switchToAmount")
                        : t("switchToPercent")}
                    </span>
                  </button>

                  {!showDiscount && (
                    <button
                      type="button"
                      onClick={() => setShowDiscount(true)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-0.5"
                    >
                      <Tag size={10} />
                      <span>{t("addDiscount")}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative flex items-center">
                <div className="absolute left-2.5 text-slate-400 pointer-events-none">
                  {makingType === "percent" ? (
                    <Percent size={14} />
                  ) : (
                    <IndianRupee size={14} />
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-8 pr-24 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
                <span className="absolute right-2.5 text-xs font-mono font-bold text-slate-600">
                  {makingType === "percent"
                    ? `≈ ₹${calculations.originalMakingAmount}`
                    : `≈ ${calculations.makingPercent}%`}
                </span>
              </div>
            </div>

            {/* Discount on Making Charges (Hidden until toggled on) */}
            {showDiscount && (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-300 rounded-lg space-y-1.5 transition-all animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Tag size={12} className="text-emerald-700" />
                    <label
                      htmlFor={discountId}
                      className="text-xs font-bold text-emerald-900 uppercase tracking-wider block"
                    >
                      {t("discountOnMaking")}
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setDiscountType(
                          discountType === "percent" ? "amount" : "percent"
                        )
                      }
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                    >
                      {discountType === "percent"
                        ? t("switchToAmount")
                        : t("switchToPercent")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDiscount(false)}
                      className="text-slate-400 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                      title={t("removeDiscount")}
                      aria-label={t("removeDiscount")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center">
                  <div className="absolute left-2.5 text-emerald-600 pointer-events-none">
                    {discountType === "percent" ? (
                      <Percent size={13} />
                    ) : (
                      <IndianRupee size={13} />
                    )}
                  </div>
                  <input
                    id={discountId}
                    type="number"
                    step={discountType === "percent" ? "1" : "10"}
                    min="0"
                    max={discountType === "percent" ? "100" : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    aria-label={t("discountOnMaking")}
                    className="w-full bg-white border border-emerald-300 rounded-md py-1 pl-7 pr-24 font-mono text-sm font-bold text-emerald-950 focus:border-emerald-700 focus:outline-none"
                  />
                  <span className="absolute right-2.5 text-xs font-mono font-bold text-emerald-800">
                    -₹{calculations.discountAmount}
                  </span>
                </div>
              </div>
            )}

            {/* Row 4: Taxes (GST) - Unified 3% first & default */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
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
                  className={`py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
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
                  className={`py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    gstType === "split"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {t("splitTax")}
                </button>
              </div>

              {/* Concise single-line tax note to avoid vertical bulk */}
              <div className="text-[10px] text-slate-500 pt-0.5">
                {gstType === "unified" ? (
                  <span>
                    <strong className="text-slate-700">Unified 3%:</strong> 3% GST on Subtotal (Gold + Making)
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-700">Split:</strong> 3% GST on Gold + 5% GST on Making
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown Column (Price Breakup) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-amber-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {t("priceBreakup")} ({selectedKarat})
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                ₹{calculations.actualRatePerGram}/g
              </span>
            </div>

            {/* Step Rows */}
            <div className="p-3.5 sm:p-4 space-y-2.5 flex-1">
              {/* Step 1: Base Gold */}
              <div className="flex items-start justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    {t("baseGoldValue")} ({selectedKarat})
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {weight || "0"}g × ₹{calculations.actualRatePerGram}/g
                  </p>
                </div>
                <span className="text-sm sm:text-base font-bold font-mono text-slate-900">
                  ₹{calculations.goldValue}
                </span>
              </div>

              {/* Step 2: Making Charges (with discount deduction if applied) */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {t("makingCharges")}
                      </span>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                        {calculations.makingPercent}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {makingType === "percent"
                        ? `${calculations.makingPercent}% of Gold Value`
                        : `Fixed Charge`}
                    </p>
                  </div>
                  <span
                    className={`text-sm sm:text-base font-bold font-mono ${
                      calculations.hasDiscount
                        ? "line-through text-slate-400 text-xs"
                        : "text-slate-900"
                    }`}
                  >
                    ₹{calculations.originalMakingAmount}
                  </span>
                </div>

                {/* If Discount is Active, show discount deduction row */}
                {calculations.hasDiscount && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <Tag size={10} />
                      {t("discountOnMaking")} ({discountValue}
                      {discountType === "percent" ? "%" : "₹"})
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      -₹{calculations.discountAmount}
                    </span>
                  </div>
                )}

                {/* Net Making Charge if discounted */}
                {calculations.hasDiscount && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {t("netMakingCharges")}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{calculations.netMakingAmount}
                    </span>
                  </div>
                )}
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 rounded-md border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t("subtotal")}
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-slate-900">
                  ₹{calculations.subtotal}
                </span>
              </div>

              {/* Step 3: Taxes (Unified is default) */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  {t("taxes")} ({gstType === "unified" ? "Unified 3%" : "Split 3%+5%"})
                </span>

                {gstType === "unified" ? (
                  <div className="p-2 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
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
                    <div className="p-2 bg-slate-50 rounded-md border border-slate-200">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        GST 3% (Gold)
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        ₹{calculations.goldGst}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-md border border-slate-200">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        GST 5% (Making)
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        ₹{calculations.makingGst}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Total Footer Banner */}
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white border-t border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                    {t("finalTotal")}
                  </span>
                  <span className="text-[10px] text-slate-300">
                    Net payable ({selectedKarat})
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
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
