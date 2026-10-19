import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FlaskConical,
  Calculator,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Globe,
  Menu,
} from "lucide-react";
import { Tooltip } from "./Tooltip";
import { useLanguage } from "../../lib/LanguageContext";

interface TopNavProps {
  isParsed?: boolean;
  fileHandle?: any;
  onPrint?: () => void;
  onReload?: () => void;
  onOpenSidebar?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  isParsed = false,
  fileHandle = null,
  onPrint,
  onReload,
  onOpenSidebar,
}) => {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const isDashboard = location.pathname === "/";
  const isCalculator = location.pathname === "/calculator";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 w-full max-w-full overflow-x-clip">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-4 w-full min-w-0">
          {/* Left: Hamburger Menu Trigger + Brand / Current Module Breadcrumb */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
            {/* Hamburger Button (Desktop and Mobile) */}
            <Tooltip content="Navigation Menu">
              <button
                type="button"
                onClick={onOpenSidebar}
                aria-label="Open sidebar menu"
                className="p-1.5 sm:p-2 -ml-0.5 sm:-ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <Menu size={19} className="sm:w-5 sm:h-5" />
              </button>
            </Tooltip>

            {/* Brand Link */}
            <Link
              to="/"
              className="flex items-center gap-1.5 sm:gap-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded p-0.5 sm:p-1 group shrink-0"
              title="Metallurgist Pro"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-slate-800 transition-colors">
                <FlaskConical size={15} className="text-amber-400 sm:w-4 sm:h-4" />
              </div>
              <span className="font-headline font-bold text-sm sm:text-base tracking-tight text-slate-900 hidden sm:inline">
                Metallurgist
              </span>
            </Link>

            {/* Current View Breadcrumb Tag (shown on tablet & desktop) */}
            <div className="hidden md:flex items-center gap-1.5 pl-1 text-slate-800">
              <span className="text-slate-300 text-xs font-bold">/</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                {isDashboard ? (
                  <SlidersHorizontal size={13} className="text-amber-600" />
                ) : (
                  <Calculator size={13} className="text-amber-600" />
                )}
                <span>{isDashboard ? t("dashboard") : t("calculator")}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions, Language Picker & Quick Tools (Responsive on mobile) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Language Picker */}
            <div className="relative inline-flex items-center bg-slate-100 border border-slate-300 rounded-lg px-1.5 sm:px-2 py-1 text-xs shadow-2xs">
              <Globe size={12} className="text-slate-500 mr-1 sm:mr-1.5 shrink-0" />
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

            {/* Dashboard Specific Actions */}
            {isDashboard && isParsed && (
              <>
                {fileHandle && onReload && (
                  <Tooltip content={t("reload")}>
                    <button
                      type="button"
                      onClick={onReload}
                      aria-label={t("reload")}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      <RefreshCw size={13} />
                      <span className="hidden lg:inline">{t("reload")}</span>
                    </button>
                  </Tooltip>
                )}

                {onPrint && (
                  <Tooltip content={t("print")}>
                    <button
                      type="button"
                      onClick={onPrint}
                      aria-label={t("print")}
                      className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      <Printer size={13} />
                      <span className="hidden sm:inline">{t("print")}</span>
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
