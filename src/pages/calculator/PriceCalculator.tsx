import React, { useState, useEffect, useMemo } from "react";
import { 
  Calculator, 
  ChevronRight, 
  Info, 
  Percent, 
  IndianRupee, 
  Weight, 
  Zap, 
  Scale,
  Receipt,
  HelpCircle,
  ArrowRightLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../lib/LanguageContext";

export default function PriceCalculator() {
  const { t } = useLanguage();
  
  // Inputs
  const [weight, setWeight] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [rateType, setRateType] = useState<"gram" | "10gram">("10gram");
  const [makingType, setMakingType] = useState<"percent" | "amount">("percent");
  const [makingValue, setMakingValue] = useState<string>("");
  const [gstType, setGstType] = useState<"split" | "unified">("split");

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
      actualRatePerGram: actualRatePerGram.toFixed(2),
      goldValue: goldValue.toFixed(2),
      makingAmount: makingAmount.toFixed(2),
      makingPercent: makingPercent.toFixed(2),
      subtotal: subtotal.toFixed(2),
      goldGst: goldGst.toFixed(2),
      makingGst: makingGst.toFixed(2),
      totalGst: totalGst.toFixed(2),
      finalTotal: finalTotal.toFixed(2)
    };
  }, [weight, rate, rateType, makingType, makingValue, gstType]);

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8 flex items-center justify-center">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(var(--color-primary-rgb),0.05),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(var(--color-secondary-rgb),0.05),transparent_40%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10"
      >
        {/* Left Col: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-xl shadow-primary/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Calculator size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase italic">{t('priceBreakup') || 'Price Breakup'}</h1>
                <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest leading-none mt-1">Laboratory Calculator</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Gold Weight */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">{t('weight')}</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity">
                    <Scale size={18} />
                  </div>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Enter weight in grams"
                    className="w-full bg-surface-container-high border-2 border-transparent focus:border-primary/30 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-black transition-all outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-outline uppercase tracking-widest">GRAMS</div>
                </div>
              </div>

              {/* Rate Type */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Gold Rate Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRateType("gram")}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                      rateType === "gram" 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                        : "bg-surface-container-high text-outline border-transparent hover:border-primary/20"
                    }`}
                  >
                    Per Gram
                  </button>
                  <button
                    onClick={() => setRateType("10gram")}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                      rateType === "10gram" 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                        : "bg-surface-container-high text-outline border-transparent hover:border-primary/20"
                    }`}
                  >
                    Per 10 Grams
                  </button>
                </div>
              </div>

              {/* Gold Rate */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Current Gold Rate</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity">
                    <IndianRupee size={18} />
                  </div>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder={`Enter rate per ${rateType === "gram" ? "gram" : "10g"}`}
                    className="w-full bg-surface-container-high border-2 border-transparent focus:border-primary/30 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-black transition-all outline-none"
                  />
                </div>
              </div>

              {/* Making Charges */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Making Charges</label>
                  <button 
                    onClick={() => setMakingType(makingType === "percent" ? "amount" : "percent")}
                    className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                  >
                    <ArrowRightLeft size={10} />
                    Switch to {makingType === "percent" ? "Amount" : "%"}
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity">
                    {makingType === "percent" ? <Percent size={18} /> : <IndianRupee size={18} />}
                  </div>
                  <input
                    type="number"
                    value={makingValue}
                    onChange={(e) => setMakingValue(e.target.value)}
                    placeholder={`Enter ${makingType === "percent" ? "percent" : "fixed amount"}`}
                    className="w-full bg-surface-container-high border-2 border-transparent focus:border-primary/30 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-black transition-all outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                    <div className="text-[10px] font-black text-outline uppercase tracking-widest leading-none">
                      {makingType === "percent" ? "% MAKING" : "TOTAL MAKING"}
                    </div>
                    {makingValue && (
                      <div className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5">
                        {makingType === "percent" ? `≈ ₹${calculations.makingAmount}` : `≈ ${calculations.makingPercent}%`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* GST Type */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 mb-2 ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline">Tax configuration (GST)</label>
                  <Tooltip text="Standard: 3% on Gold + 5% on Making. Unified: 3% on entire subtotal." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGstType("split")}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                      gstType === "split" 
                        ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/20" 
                        : "bg-surface-container-high text-outline border-transparent hover:border-secondary/20"
                    }`}
                  >
                    Split (3% + 5%)
                  </button>
                  <button
                    onClick={() => setGstType("unified")}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                      gstType === "unified" 
                        ? "bg-secondary text-white border-secondary shadow-lg shadow-secondary/20" 
                        : "bg-surface-container-high text-outline border-transparent hover:border-secondary/20"
                    }`}
                  >
                    Unified (3%)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Output Breakup */}
        <div className="lg:col-span-3">
          <div className="bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/30 shadow-2xl h-full flex flex-col">
            <div className="bg-primary/5 p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-on-primary shadow-xl shadow-primary/20">
                  <Receipt size={24} />
                </div>
                <h2 className="text-xl font-black font-headline tracking-tighter uppercase italic">Calculation <span className="text-primary">Breakup</span></h2>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-outline uppercase tracking-widest">Reference ID</span>
                <span className="text-xs font-mono font-black text-on-surface">#{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Step 1: Gold Value */}
              <BreakupStep 
                num="01"
                title="Base Gold Value"
                description={`Total weight (${weight || '0'}g) calculated at ₹${calculations.actualRatePerGram}/g`}
                value={calculations.goldValue}
                icon={<Weight size={16} />}
              />

              {/* Step 2: Making Charges */}
              <BreakupStep 
                num="02"
                title="Making Charges"
                description={
                  makingType === "percent" 
                    ? `${calculations.makingPercent}% calculated on Gold value` 
                    : `Fixed amount of ₹${calculations.makingAmount} adding to base`
                }
                value={calculations.makingAmount}
                icon={<Zap size={16} />}
                badge={calculations.makingPercent + "%"}
              />

              {/* Subtotal */}
              <div className="h-[1px] bg-outline-variant/30 my-4" />
              
              <div className="flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ChevronRight size={12} className="text-outline" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-outline-variant uppercase tracking-widest block mb-0.5">Subtotal</span>
                    <span className="text-sm font-black text-on-surface">Gold Value + Making</span>
                  </div>
                </div>
                <span className="text-lg font-black font-mono">₹{calculations.subtotal}</span>
              </div>

              <div className="h-[1px] bg-outline-variant/30 my-4" />

              {/* Step 3: Taxes */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-[10px] font-black text-outline uppercase tracking-widest">Taxation Details ({gstType === 'split' ? 'Split Mode' : 'Unified Mode'})</span>
                </div>

                {gstType === "split" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-high rounded-2xl p-4 border border-outline-variant/20">
                      <span className="text-[9px] font-black text-outline uppercase tracking-widest block mb-1">GST @ 3% (Gold)</span>
                      <span className="text-base font-black font-mono text-on-surface">₹{calculations.goldGst}</span>
                    </div>
                    <div className="bg-surface-container-high rounded-2xl p-4 border border-outline-variant/20">
                      <span className="text-[9px] font-black text-outline uppercase tracking-widest block mb-1">GST @ 5% (Making)</span>
                      <span className="text-base font-black font-mono text-on-surface">₹{calculations.makingGst}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container-high rounded-2xl p-4 border border-outline-variant/20 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black text-outline uppercase tracking-widest block mb-1">Unified GST @ 3% (Total)</span>
                      <span className="text-base font-black font-mono text-on-surface">₹{calculations.totalGst}</span>
                    </div>
                    <div className="px-3 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      Inclusive Base
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Total Footer */}
            <div className="bg-surface-container p-6 border-t border-outline-variant/30 relative overflow-hidden">
               {/* Visual pulse for urgency/importance */}
               <div className="absolute inset-0 bg-primary/5 animate-pulse" />
               
               <div className="flex items-center justify-between relative z-10">
                 <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">Grand Estimated Total</span>
                    <h3 className="text-3xl font-black font-headline tracking-tighter text-on-surface leading-none">Net <span className="text-primary italic">Payable</span></h3>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono font-black text-outline-variant line-through mb-1">₹{calculations.subtotal}</span>
                    <span className="text-4xl font-black font-mono text-primary drop-shadow-sm leading-none">₹{calculations.finalTotal}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function BreakupStep({ num, title, description, value, icon, badge }: any) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-[10px] font-black text-outline transition-all group-hover:bg-primary group-hover:text-white group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/20">
          {num}
        </div>
        <div className="w-[2px] flex-1 bg-outline-variant/20 rounded-full min-h-[40px]" />
      </div>
      
      <div className="flex-1 flex justify-between items-center bg-surface-container-low group-hover:bg-surface-container-high rounded-2xl p-4 border border-outline-variant/20 transition-all cursor-default">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 text-primary opacity-60">{icon}</span>
            <span className="text-xs font-black uppercase tracking-tight text-on-surface">{title}</span>
            {badge && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest">{badge}</span>
            )}
          </div>
          <p className="text-[10px] text-outline leading-relaxed max-w-[200px]">{description}</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-black text-outline-variant uppercase tracking-widest block mb-1">Total</span>
          <span className="text-lg font-black font-mono text-on-surface">₹{value}</span>
        </div>
      </div>
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex items-center">
      <HelpCircle 
        size={14} 
        className="text-outline-variant hover:text-primary transition-colors cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-surface-container-highest p-3 rounded-xl border border-outline-variant/30 shadow-2xl z-[100] text-[10px] font-bold text-on-surface-variant leading-relaxed text-center"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-surface-container-highest" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
