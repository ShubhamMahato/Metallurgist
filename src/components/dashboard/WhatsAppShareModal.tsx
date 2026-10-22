import React, { useState, useEffect, useId, useRef } from "react";
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Phone,
  Trash2,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  SharedReportPayload,
  ReportTemplateId,
  REPORT_TEMPLATES,
} from "../../types/report";
import {
  createCompactReportPackage,
  generateWhatsAppMessage,
  buildWhatsAppLink,
  openWhatsAppChat,
  extractTenDigitNumber,
  calculateKaratFromPurity,
} from "../../utils/cryptoReport";
import { MetalValue } from "../../types/dashboard";
import {
  getRecentPhoneNumbers,
  savePhoneNumber,
  deletePhoneNumber,
  SavedContact,
} from "../../lib/phoneStorage";
import { useShopName } from "../../lib/useShopName";
import { getDecimalPrecision } from "../../lib/settingsStore";
import { useLanguage } from "../../lib/LanguageContext";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  sampleType: string;
  weight: string;
  goldPurity: string;
  karatExact: string;
  karatDisplay: string;
  metals: MetalValue[];
}

const STORAGE_KEY_TEMPLATE = "metallurgist_preferred_template";

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  customerName,
  sampleType,
  weight,
  goldPurity,
  karatExact,
  karatDisplay,
  metals,
}) => {
  const [phone, setPhone] = useState<string>("");
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [whatsAppText, setWhatsAppText] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [ibjaRate, setIbjaRate] = useState<number>(0);
  const { shopName } = useShopName();
  const { t } = useLanguage();

  const [includeLink, setIncludeLink] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("metallurgist_wa_include_link");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  const [includeValuation, setIncludeValuation] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("metallurgist_wa_include_valuation");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const phoneInputId = useId();

  // Load preferred template from localStorage or fallback
  const [activeTemplateId, setActiveTemplateId] = useState<ReportTemplateId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEMPLATE);
      if (saved && REPORT_TEMPLATES.some((t) => t.id === saved)) {
        return saved as ReportTemplateId;
      }
    } catch {}
    return "classic-lab";
  });

  // Keep template synced when modal opens or when changed globally
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TEMPLATE);
        if (saved && REPORT_TEMPLATES.some((t) => t.id === saved)) {
          setActiveTemplateId(saved as ReportTemplateId);
        }
      } catch {}
    }
  }, [isOpen]);

  useEffect(() => {
    const handleTemplateChanged = (e: Event) => {
      const customEvent = e as CustomEvent<ReportTemplateId>;
      if (customEvent.detail && REPORT_TEMPLATES.some((t) => t.id === customEvent.detail)) {
        setActiveTemplateId(customEvent.detail);
      }
    };
    window.addEventListener("templateChanged", handleTemplateChanged);
    return () => window.removeEventListener("templateChanged", handleTemplateChanged);
  }, []);

  const [decimalPrecision, setDecimalPrecision] = useState<number>(2);

  // Keep decimal precision synced
  useEffect(() => {
    if (isOpen) {
      getDecimalPrecision().then((dp) => setDecimalPrecision(dp));
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePrecisionChanged = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        setDecimalPrecision(customEvent.detail);
      }
    };
    window.addEventListener("decimalPrecisionChanged", handlePrecisionChanged);
    return () => window.removeEventListener("decimalPrecisionChanged", handlePrecisionChanged);
  }, []);

  const activeTemplateMeta =
    REPORT_TEMPLATES.find((t) => t.id === activeTemplateId) || REPORT_TEMPLATES[0];

  // Load saved phone numbers from IndexedDB on open
  useEffect(() => {
    if (isOpen) {
      getRecentPhoneNumbers().then((contacts) => {
        setSavedContacts(contacts);
        if (contacts.length > 0 && !phone) {
          // Pre-fill with most recent contact or leave empty for user choice
        }
      });
    }
  }, [isOpen]);

  // Click outside to close phone dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch live IBJA rates from snapdata.dev
  useEffect(() => {
    let isMounted = true;
    async function fetchIbja() {
      try {
        const response = await fetch("https://snapdata.dev/api/v1/gold/in/latest.json");
        if (response.ok) {
          const data = await response.json();
          const obs: any[] = data.observations || [];
          let targetRate = 0;

          const purityNum = parseFloat(goldPurity) || 75;
          const fallbackKarat = calculateKaratFromPurity(purityNum);
          const targetInst = (
            karatDisplay && !/\d+\.\d+/.test(karatDisplay)
              ? (karatDisplay.endsWith("K") ? karatDisplay : `${karatDisplay}K`)
              : fallbackKarat.karatDisplay
          ).toUpperCase();
          for (const item of obs) {
            if (
              item.instrument?.includes(targetInst) ||
              item.instrument_id?.includes(targetInst)
            ) {
              const val = typeof item.value === "number" ? item.value : parseFloat(item.value);
              if (!isNaN(val) && val > 0) {
                targetRate = val;
                break;
              }
            }
          }

          if (!targetRate) {
            for (const item of obs) {
              if (item.instrument?.includes("24K") || item.instrument_id?.includes("24K")) {
                const val = typeof item.value === "number" ? item.value : parseFloat(item.value);
                if (!isNaN(val) && val > 0) {
                  const purityNum = parseFloat(goldPurity) || 75;
                  targetRate = Math.round(val * (purityNum / 100));
                  break;
                }
              }
            }
          }

          if (isMounted && targetRate > 0) {
            setIbjaRate(targetRate);
          }
        }
      } catch (err) {
        const purityNum = parseFloat(goldPurity) || 75;
        const estimated24K = 14929;
        if (isMounted) {
          setIbjaRate(Math.round(estimated24K * (purityNum / 100)));
        }
      }
    }

    if (isOpen) {
      fetchIbja();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, karatDisplay, goldPurity]);

  // Generate payload & message (Behind the scenes, SHA-256 checksum is calculated and embedded in link)
  useEffect(() => {
    let isCancelled = false;

    async function buildCryptoData() {
      if (!isOpen) return;
      setIsGenerating(true);

      const weightNum = parseFloat(weight) || 0;
      const calculatedGoldVal = Math.round(weightNum * ibjaRate * 100) / 100;

      const purityNum = parseFloat(goldPurity || "0");
      const karatInfo = calculateKaratFromPurity(purityNum);
      const cleanKaratDisplay =
        karatDisplay && !/\d+\.\d+/.test(karatDisplay)
          ? (karatDisplay.endsWith("K") ? karatDisplay : `${karatDisplay}K`)
          : karatInfo.karatDisplay;
      const cleanKaratExact = (karatExact || karatInfo.karatExact).replace(/k$/i, "").trim();

        const precision = decimalPrecision === 2 ? 2 : 3;

      const payload: SharedReportPayload = {
        version: "1.0",
        reportId: `AS-${Date.now().toString().slice(-6)}`,
        shopName: shopName.trim() || undefined,
        customerName: customerName || "Customer",
        sampleType: sampleType || "Gold Sample",
        weight: weight || "0.000",
        timestamp: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        goldPurity: purityNum.toFixed(precision),
        karatExact: cleanKaratExact,
        karatDisplay: cleanKaratDisplay,
        metals: metals.map((m) => ({
          id: m.id,
          name: m.name,
          symbol: m.symbol,
          value: parseFloat(m.value || "0").toFixed(precision),
          baseline: m.baseline,
        })),
        marketRate:
          ibjaRate > 0
            ? {
                ratePerGram: ibjaRate,
                rateSource: "IBJA Retail Standard",
                calculatedGoldValue: calculatedGoldVal,
                fetchedAt: new Date().toISOString(),
                karatCategory: karatDisplay,
              }
            : undefined,
        templateId: activeTemplateId,
        decimalPrecision: precision,
      };

      try {
        const { url } = await createCompactReportPackage({
          shopName: shopName.trim() || undefined,
          customerName: customerName || "Customer",
          weight: weight || "0.000",
          goldPurity: goldPurity || metals.find((m) => m.id === "gold")?.value || "0.000",
          metals: metals.map((m) => ({
            id: m.id,
            symbol: m.symbol,
            value: m.value,
          })),
          templateId: activeTemplateId,
          decimalPrecision: precision,
        });

        const msg = generateWhatsAppMessage(payload, url, precision, {
          includeLink,
          includeValuation,
        });

        if (!isCancelled) {
          setShareUrl(url);
          setWhatsAppText(msg);
        }
      } catch (err) {
        console.error("Failed to generate report package:", err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    }

    buildCryptoData();

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    activeTemplateId,
    customerName,
    sampleType,
    weight,
    goldPurity,
    karatExact,
    karatDisplay,
    metals,
    ibjaRate,
    shopName,
    decimalPrecision,
    includeLink,
    includeValuation,
  ]);

  if (!isOpen) return null;

  const handleSelectContact = (selectedPhone: string) => {
    setPhone(selectedPhone);
    setShowDropdown(false);
  };

  const handleDeleteContact = async (e: React.MouseEvent, phoneToDelete: string) => {
    e.stopPropagation();
    await deletePhoneNumber(phoneToDelete);
    setSavedContacts((prev) => prev.filter((c) => c.phone !== phoneToDelete));
  };

  const handleSendWhatsApp = () => {
    const rawDigits = extractTenDigitNumber(phone);
    if (rawDigits) {
      savePhoneNumber(rawDigits, customerName).catch((err) =>
        console.error("Failed to save contact:", err)
      );
    }
    const waLink = buildWhatsAppLink(whatsAppText, rawDigits);
    openWhatsAppChat(waLink);
    onClose();
  };

  const handleCopyLink = async () => {
    const rawDigits = extractTenDigitNumber(phone);
    if (rawDigits) {
      await savePhoneNumber(rawDigits, customerName);
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const filteredContacts = savedContacts.filter((c) =>
    c.phone.toLowerCase().includes(phone.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog (Bottom-sheet on mobile, centered modal on tablet/desktop) */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92dvh] sm:max-h-[90vh] z-10 flex flex-col my-0 sm:my-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150 overflow-hidden">
        {/* Mobile pull handle indicator */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0 bg-white">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageCircle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-headline font-bold text-base sm:text-lg text-slate-900 leading-tight truncate">
                {t("shareOnWhatsApp")}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="shrink-0">{t("reportTemplateLabel")}</span>
                <select
                  value={activeTemplateId}
                  onChange={(e) => {
                    const newTmpl = e.target.value as ReportTemplateId;
                    setActiveTemplateId(newTmpl);
                    try {
                      localStorage.setItem(STORAGE_KEY_TEMPLATE, newTmpl);
                      window.dispatchEvent(
                        new CustomEvent("templateChanged", { detail: newTmpl })
                      );
                    } catch {}
                  }}
                  className="font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 text-[11px] cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-emerald-500 max-w-[140px] sm:max-w-none truncate"
                >
                  {REPORT_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.badge})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0 ml-1.5"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-3.5 space-y-3">
          {/* Mobile Number Input with Auto-Prefixed +91 & Dropdown Autocomplete */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <label
              htmlFor={phoneInputId}
              className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Phone size={13} className="text-emerald-600" />
                <span>{t("mobileNumberLabel")}</span>
              </span>
              {savedContacts.length > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">
                  {t("savedNumbersAvailable")}
                </span>
              )}
            </label>

            <div className="relative flex items-center">
              <span className="inline-flex items-center px-3 h-11 sm:h-10 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-700 text-xs font-mono font-bold select-none shrink-0">
                +91
              </span>
              <div className="relative flex-1">
                <input
                  ref={phoneInputRef}
                  id={phoneInputId}
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    const cleaned = extractTenDigitNumber(e.target.value);
                    setPhone(cleaned);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={t("mobilePlaceholder")}
                  className="w-full text-base sm:text-xs font-mono px-3 h-11 sm:h-10 bg-slate-50 border border-slate-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white pr-9 transition-all"
                  autoComplete="off"
                />

                {savedContacts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded cursor-pointer"
                    title={t("viewSavedContacts")}
                  >
                    <ChevronDown size={14} />
                  </button>
                )}

                {/* Autocomplete Dropdown List */}
                {showDropdown && savedContacts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                      {t("recentNumbers")}
                    </div>
                    {filteredContacts.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        {t("noMatchingNumbers")}
                      </div>
                    ) : (
                      filteredContacts.map((contact) => (
                        <div
                          key={contact.phone}
                          onClick={() => handleSelectContact(extractTenDigitNumber(contact.phone))}
                          className="flex items-center justify-between px-3 py-2.5 sm:py-2 text-xs hover:bg-emerald-50/70 active:bg-emerald-100 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <Phone size={12} className="text-emerald-600 shrink-0" />
                            <span className="font-mono font-semibold text-slate-900">
                              +91 {extractTenDigitNumber(contact.phone)}
                            </span>
                            {contact.name && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded truncate max-w-[120px]">
                                {contact.name}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteContact(e, contact.phone)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title={t("deleteFromSaved")}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              {t("phoneHelperText")}
            </p>
          </div>

          {/* Customization Checkboxes: Report Link & Market Valuation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-100 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={includeLink}
                onChange={(e) => {
                  const val = e.target.checked;
                  setIncludeLink(val);
                  try {
                    localStorage.setItem("metallurgist_wa_include_link", String(val));
                  } catch {}
                }}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-800">
                  {t("includeReportLink")}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {t("includeReportLinkDesc")}
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-100 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={includeValuation}
                onChange={(e) => {
                  const val = e.target.checked;
                  setIncludeValuation(val);
                  try {
                    localStorage.setItem("metallurgist_wa_include_valuation", String(val));
                  } catch {}
                }}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-800">
                  {t("includeValuation")}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {t("includeValuationDesc")}
                </span>
              </div>
            </label>
          </div>

          {/* Message Preview (Clean, compact and focused) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-700">
                {t("messagePreview")}
              </span>
              <span className="text-[10px] text-slate-400">
                {t("messagePreviewHelp")}
              </span>
            </div>

            <textarea
              readOnly
              value={whatsAppText}
              rows={3}
              className="w-full text-xs font-mono p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none select-all resize-none shadow-2xs leading-relaxed max-h-28 sm:max-h-36"
            />
          </div>
        </div>

        {/* Footer Actions (Optimized for thumb reach on mobile/tablet) */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50/90 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={isGenerating || !whatsAppText}
            className="w-full sm:w-auto order-1 sm:order-2 inline-flex items-center justify-center gap-2 px-5 h-11 sm:h-9 text-sm sm:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            <MessageCircle size={17} />
            <span>{t("sendOnWhatsApp")}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={isGenerating || !shareUrl}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-11 sm:h-9 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-xl shadow-2xs transition-all active:scale-[0.99] cursor-pointer"
            >
              {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{isCopied ? t("linkCopied") : t("copyLink")}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial h-11 sm:h-9 px-3.5 text-xs font-semibold text-slate-600 hover:text-slate-900 active:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppShareModal;
