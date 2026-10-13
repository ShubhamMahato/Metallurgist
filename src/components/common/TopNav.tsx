import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FlaskConical,
  Calculator,
  Printer,
  Download,
  RefreshCw,
  SlidersHorizontal,
  HardDrive,
  Globe,
} from "lucide-react";
import { Tooltip } from "./Tooltip";
import { useLanguage } from "../../lib/LanguageContext";

interface TopNavProps {
  isParsed?: boolean;
  isPersistent?: boolean;
  isSaving?: boolean;
  fileHandle?: any;
  onSaveOrDownload?: () => void;
  onPrint?: () => void;
  onReload?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  isParsed = false,
  isPersistent = false,
  isSaving = false,
  fileHandle = null,
  onSaveOrDownload,
  onPrint,
  onReload,
}) => {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const isDashboard = location.pathname === "/";
  const isCalculator = location.pathname === "/calculator";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded p-1"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <FlaskConical size={16} className="text-amber-400" />
              </div>
              <span className="font-headline font-bold text-sm sm:text-base tracking-tight text-slate-900">
                Metallurgist
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav
            aria-label="Navigation"
            className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-lg border border-slate-200 shrink-0"
          >
            <Link
              to="/"
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                isDashboard
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal size={13} className={isDashboard ? "text-amber-600" : "text-slate-400"} />
              <span>{t("dashboard")}</span>
            </Link>

            <Link
              to="/calculator"
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                isCalculator
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calculator size={13} className={isCalculator ? "text-amber-600" : "text-slate-400"} />
              <span>{t("calculator")}</span>
            </Link>
          </nav>

          {/* Actions & Language */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Picker */}
            <div className="relative inline-flex items-center bg-slate-100 border border-slate-300 rounded-md px-1.5 py-1 text-xs">
              <Globe size={13} className="text-slate-500 mr-1 shrink-0" />
              <label htmlFor="nav-lang-select" className="sr-only">Language</label>
              <select
                id="nav-lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="en">EN</option>
                <option value="hi">हिंदी</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            {/* Dashboard Actions */}
            {isDashboard && isParsed && (
              <>
                {fileHandle && onReload && (
                  <Tooltip content={t("reload")}>
                    <button
                      type="button"
                      onClick={onReload}
                      aria-label={t("reload")}
                      className="p-1.5 text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </Tooltip>
                )}

                {onPrint && (
                  <Tooltip content={t("print")}>
                    <button
                      type="button"
                      onClick={onPrint}
                      aria-label={t("print")}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      <Printer size={13} />
                      <span>{t("print")}</span>
                    </button>
                  </Tooltip>
                )}

                {onSaveOrDownload && (
                  <Tooltip content={isPersistent ? t("save") : t("download")}>
                    <button
                      type="button"
                      onClick={onSaveOrDownload}
                      disabled={isSaving}
                      aria-label={isPersistent ? t("save") : t("download")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-md shadow-xs transition-colors"
                    >
                      {isPersistent ? (
                        <HardDrive size={13} className="text-emerald-400" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span className="hidden xs:inline">
                        {isSaving ? t("saving") : isPersistent ? t("save") : t("download")}
                      </span>
                    </button>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
