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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 w-full max-w-full overflow-x-clip">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-4 w-full min-w-0">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded p-1"
              title="Metallurgist Pro"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-slate-800 transition-colors">
                <FlaskConical size={16} className="text-amber-400" />
              </div>
              <span className="font-headline font-bold text-sm sm:text-base tracking-tight text-slate-900 hidden sm:inline">
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
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                isDashboard
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title={t("dashboard")}
            >
              <SlidersHorizontal
                size={13}
                className={isDashboard ? "text-amber-600" : "text-slate-400"}
              />
              <span className="hidden min-[360px]:inline">{t("dashboard")}</span>
            </Link>

            <Link
              to="/calculator"
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                isCalculator
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title={t("calculator")}
            >
              <Calculator
                size={13}
                className={isCalculator ? "text-amber-600" : "text-slate-400"}
              />
              <span className="hidden min-[360px]:inline">{t("calculator")}</span>
            </Link>
          </nav>

          {/* Actions & Language */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Language Picker */}
            <div className="relative inline-flex items-center bg-slate-100 border border-slate-300 rounded-md px-1.5 py-1 text-xs">
              <Globe size={13} className="text-slate-500 mr-1 shrink-0" />
              <label htmlFor="nav-lang-select" className="sr-only">
                Language
              </label>
              <select
                id="nav-lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-0.5"
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
                      className="p-1.5 text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </Tooltip>
                )}

                {onPrint && (
                  <Tooltip content={t("print")}>
                    <button
                      type="button"
                      onClick={onPrint}
                      aria-label={t("print")}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
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
                      className="inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-md shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      {isPersistent ? (
                        <HardDrive size={13} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Download size={13} className="shrink-0" />
                      )}
                      <span className="hidden sm:inline">
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
