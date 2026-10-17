import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FlaskConical,
  SlidersHorizontal,
  Calculator,
  X,
  Sparkles,
  Layers,
  Eye,
  Store,
  Check,
} from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext";
import { ReportTemplateId, REPORT_TEMPLATES } from "../../types/report";
import { TemplatePreviewModal } from "./TemplatePreviewModal";
import { useShopName } from "../../lib/useShopName";

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY_TEMPLATE = "metallurgist_preferred_template";

export const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { shopName, updateShopName } = useShopName();
  const [localShopName, setLocalShopName] = useState(shopName);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalShopName(shopName);
    }
  }, [shopName]);

  const isDashboard = location.pathname === "/";
  const isCalculator = location.pathname === "/calculator";

  const [activeTemplate, setActiveTemplate] = useState<ReportTemplateId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEMPLATE);
      if (saved && REPORT_TEMPLATES.some((tmpl) => tmpl.id === saved)) {
        return saved as ReportTemplateId;
      }
    } catch {}
    return "classic-lab";
  });

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    const handleTemplateChanged = (e: Event) => {
      const customEvent = e as CustomEvent<ReportTemplateId>;
      if (customEvent.detail && REPORT_TEMPLATES.some((tmpl) => tmpl.id === customEvent.detail)) {
        setActiveTemplate(customEvent.detail);
      }
    };
    window.addEventListener("templateChanged", handleTemplateChanged);
    return () => window.removeEventListener("templateChanged", handleTemplateChanged);
  }, []);

  const handleSelectTemplate = (id: ReportTemplateId) => {
    setActiveTemplate(id);
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATE, id);
      window.dispatchEvent(new CustomEvent("templateChanged", { detail: id }));
    } catch (e) {
      console.warn("Could not save template to localStorage:", e);
    }
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleShopNameChange = (val: string) => {
    setLocalShopName(val);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const clean = val.trim();
      if (clean && clean !== shopName) {
        await updateShopName(clean);
        setIsSavedFeedback(true);
        setTimeout(() => setIsSavedFeedback(false), 2000);
      }
    }, 1000);
  };

  const handleShopNameBlur = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const clean = localShopName.trim();
    setLocalShopName(clean);
    if (clean !== shopName) {
      await updateShopName(clean);
      setIsSavedFeedback(true);
      setTimeout(() => setIsSavedFeedback(false), 2000);
    }
  };

  const handleShopNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <Link
          to="/"
          onClick={handleLinkClick}
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-lg p-1"
          title="Metallurgist Pro"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-slate-800 transition-colors">
            <FlaskConical size={18} className="text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-base tracking-tight text-slate-900 leading-tight">
              Metallurgist
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
              Pro Metallurgy Suite
            </span>
          </div>
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-5 px-3.5 space-y-1.5 overflow-y-auto">
        <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Modules
        </div>

        {/* 1. Composition */}
        <Link
          to="/"
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
            isDashboard
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
          }`}
          title={t("dashboard")}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isDashboard
                ? "bg-white/10 text-amber-400"
                : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900 border border-slate-200/60"
            }`}
          >
            <SlidersHorizontal size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate leading-tight">{t("dashboard")}</span>
            <span
              className={`text-[11px] truncate font-normal ${
                isDashboard ? "text-slate-300" : "text-slate-400"
              }`}
            >
              Metal balance & purity
            </span>
          </div>
        </Link>

        {/* 2. Calculator */}
        <Link
          to="/calculator"
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
            isCalculator
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
          }`}
          title={t("calculator")}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isCalculator
                ? "bg-white/10 text-amber-400"
                : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900 border border-slate-200/60"
            }`}
          >
            <Calculator size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate leading-tight">{t("calculator")}</span>
            <span
              className={`text-[11px] truncate font-normal ${
                isCalculator ? "text-slate-300" : "text-slate-400"
              }`}
            >
              Retail & GST billing
            </span>
          </div>
        </Link>

        {/* Shop / Lab Identity Section */}
        <div className="pt-4 px-2.5 pb-1 border-t border-slate-100 mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Store size={12} className="text-amber-500" />
              <span>Shop / Lab Name</span>
            </span>
            {isSavedFeedback && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 animate-in fade-in">
                <Check size={10} /> Saved
              </span>
            )}
          </div>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={localShopName}
              onChange={(e) => handleShopNameChange(e.target.value)}
              onBlur={handleShopNameBlur}
              onKeyDown={handleShopNameKeyDown}
              placeholder="e.g. Shreeji Jewellers, Tanishq..."
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white font-medium"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 px-0.5">
            Saved to your device & used across templates.
          </p>
        </div>

        {/* Report Templates Section */}
        <div className="pt-4 px-2.5 pb-1 flex items-center justify-between border-t border-slate-100 mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={12} className="text-amber-500" />
            <span>Report Style</span>
          </span>
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="text-[10px] text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <Eye size={10} />
            <span>Preview All</span>
          </button>
        </div>

        <div className="space-y-1">
          {REPORT_TEMPLATES.map((tmpl) => {
            const isSelected = activeTemplate === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-amber-50/80 border border-amber-300 text-amber-950 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent"
                }`}
                title={`Select ${tmpl.name}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected
                        ? "bg-amber-500 ring-2 ring-amber-300"
                        : "bg-slate-300 group-hover:bg-slate-400"
                    }`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate leading-tight text-xs">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal truncate">
                      {tmpl.badge}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(tmpl.id);
                      setIsPreviewModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded transition-colors"
                    title={`Preview ${tmpl.name}`}
                  >
                    <Eye size={13} />
                  </button>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info Card */}
      <div className="p-3.5 border-t border-slate-200 shrink-0">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-800 truncate">
              Precision Analysis
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              3-decimal exact rebalancing
            </span>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        activeTemplateId={activeTemplate}
        onSelectTemplate={handleSelectTemplate}
        shopName={shopName}
      />
    </div>
  );
};
