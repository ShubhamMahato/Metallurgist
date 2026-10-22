import React from "react";
import {
  UploadCloud,
  HardDrive,
  RotateCcw,
  AlertCircle,
  FileText,
  Sparkles,
  Scale,
  Share2,
  List,
  LayoutGrid,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDashboard } from "../hooks/useDashboard";
import { ALL_AVAILABLE_METALS } from "../constants/metals";
import { AppLayout } from "../components/layout/AppLayout";
import { AddMetalModal } from "../components/dashboard/AddMetalModal";
import { WhatsAppShareModal } from "../components/dashboard/WhatsAppShareModal";
import { CalculationSummary } from "../components/dashboard/CalculationSummary";
import { MetalCard } from "../components/dashboard/MetalCard";
import { MetalCompactRow } from "../components/dashboard/MetalCompactRow";
import { MetadataField } from "../components/dashboard/MetadataField";
import { Tooltip } from "../components/common/Tooltip";
import { useLanguage } from "../lib/LanguageContext";

const SPECTRUM_COLORS: Record<string, string> = {
  gold: "bg-amber-500",
  silver: "bg-slate-400",
  copper: "bg-orange-500",
  zinc: "bg-teal-500",
  platinum: "bg-indigo-500",
  palladium: "bg-cyan-600",
  cadmium: "bg-rose-500",
  nickel: "bg-emerald-600",
  iron: "bg-neutral-600",
  ruthenium: "bg-violet-600",
  rhodium: "bg-blue-600",
  iridium: "bg-pink-600",
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"compact" | "cards">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("metallurgist_view_mode");
      if (saved === "compact" || saved === "cards") return saved;
      return window.innerWidth < 1024 ? "compact" : "cards";
    }
    return "compact";
  });

  const handleViewModeChange = (mode: "compact" | "cards") => {
    setViewMode(mode);
    try {
      localStorage.setItem("metallurgist_view_mode", mode);
    } catch {}
  };

  const headerSummaryRef = React.useRef<HTMLDivElement>(null);
  const [isHeaderSummaryVisible, setIsHeaderSummaryVisible] = React.useState(true);
  const dashboard = useDashboard();
  const {
    lastEditedId,
    metals,
    tempValues,
    isParsed,
    setIsParsed,
    isDragging,
    uploadError,
    setUploadError,
    karat,
    karatDisplay,
    customerName,
    setCustomerName,
    weight,
    setWeight,
    sampleType,
    setSampleType,
    isAddingMetal,
    setIsAddingMetal,
    fileHandle,
    isPersistent,
    isConnecting,
    isSaving,
    fileInputRef,
    addMetalRef,
    requestFilePermission,
    connectFile,
    handlePrint,
    saveToOriginalFile,
    reloadFile,
    handleValueChange,
    handleValueBlur,
    removeMetal,
    resetToOriginal,
    downloadDOC,
    handleFile,
    onDragOver,
    onDragLeave,
    onDrop,
    totalAggregate,
    isVerified,
    addMetal,
    autoBalance,
    toggleAutoBalance,
    triggerManualBalance,
    decimalPrecision,
    stepMetalValue,
    rebalanceCountdown,
  } = dashboard;

  React.useEffect(() => {
    if (!isParsed) {
      setIsHeaderSummaryVisible(true);
      return;
    }
    const target = headerSummaryRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeaderSummaryVisible(entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px",
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isParsed]);

  const saveOrDownload = () => {
    if (isPersistent) saveToOriginalFile();
    else downloadDOC();
  };

  const visibleMetals = metals.filter(
    (metal) =>
      (metal.baseline ?? 0) > 0 ||
      parseFloat(metal.value) > 0 ||
      metal.isManual
  );

  return (
    <AppLayout
      isParsed={isParsed}
      isPersistent={isPersistent}
      isSaving={isSaving}
      fileHandle={fileHandle}
      onSaveOrDownload={saveOrDownload}
      onPrint={handlePrint}
      onReload={reloadFile}
      onShareWhatsApp={() => setIsShareModalOpen(true)}
    >
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-2.5 sm:pt-4 pb-8 sm:pb-12 space-y-3 sm:space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.doc"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              handleFile(file);
              event.target.value = "";
            }
          }}
        />

        {/* Minimal Header */}
        <section className="bg-white rounded-xl border border-slate-200 p-2 sm:p-4 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5 sm:gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {fileHandle ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${
                      isPersistent
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : "bg-amber-50 text-amber-800 border border-amber-300"
                    }`}
                  >
                    <HardDrive size={11} className="sm:w-3 sm:h-3" />
                    {t("localConnected")}
                    {!isPersistent && (
                      <button
                        type="button"
                        onClick={requestFilePermission}
                        className="underline ml-1 font-bold hover:text-amber-950"
                      >
                        Grant
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs font-medium text-slate-500">
                    {t("localMode")}
                  </span>
                )}
              </div>

              <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight leading-none sm:leading-normal">
                {t("metalComposition")}
              </h1>
              <p className="hidden sm:block text-xs sm:text-sm text-slate-600 max-w-xl">
                {t("compositionSubtitle")}
              </p>
            </div>

            {/* Header Calculations Readout (stays in header next to Metal Composition) */}
            {isParsed && (
              <div ref={headerSummaryRef} className="shrink-0 w-full lg:w-auto mt-0.5 lg:mt-0">
                <CalculationSummary
                  totalAggregate={totalAggregate}
                  isVerified={isVerified}
                  karat={karat}
                  karatDisplay={karatDisplay}
                  isParsed={isParsed}
                  goldValue={metals.find((m) => m.id === "gold")?.value}
                  weight={weight}
                  decimalPrecision={decimalPrecision}
                />
              </div>
            )}
          </div>
        </section>

        {/* Floating Sticky Calculations Readout Bar - appears only when header summary scrolls out of viewport */}
        <AnimatePresence>
          {isParsed && !isHeaderSummaryVisible && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="fixed top-14 sm:top-16 left-0 right-0 z-20 px-3 sm:px-6 lg:px-8 py-2 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/80 shadow-md"
            >
              <div className="max-w-7xl mx-auto">
                <CalculationSummary
                  totalAggregate={totalAggregate}
                  isVerified={isVerified}
                  karat={karat}
                  karatDisplay={karatDisplay}
                  isParsed={isParsed}
                  goldValue={metals.find((m) => m.id === "gold")?.value}
                  weight={weight}
                  decimalPrecision={decimalPrecision}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload State */}
        <AnimatePresence>
          {!isParsed && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {/* 1. Upload */}
                <button
                  type="button"
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-5 sm:p-6 text-center rounded-xl border border-dashed transition-all bg-white shadow-xs group cursor-pointer relative ${
                    isDragging
                      ? "border-amber-600 bg-amber-50/50"
                      : "border-slate-300 hover:border-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    One-Time Copy
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center text-slate-700 group-hover:text-amber-700 mb-3 transition-colors">
                    <UploadCloud size={20} />
                  </div>
                  <strong className="text-sm font-bold text-slate-900">
                    {t("uploadReport")}
                  </strong>
                  <span className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
                    {t("uploadDescription")}
                  </span>
                  <span className="mt-3 px-3 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-md group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    {t("selectFile")}
                  </span>
                </button>

                {/* 2. Connect Local File */}
                <button
                  type="button"
                  onClick={connectFile}
                  disabled={isConnecting}
                  className="flex flex-col items-center justify-center p-5 sm:p-6 text-center rounded-xl border-2 border-slate-300 bg-white hover:border-blue-600 hover:bg-blue-50/30 shadow-xs transition-all group cursor-pointer disabled:opacity-50 relative"
                >
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Live Sync
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-700 mb-3 transition-colors">
                    <HardDrive size={20} />
                  </div>
                  <strong className="text-sm font-bold text-slate-900">
                    {t("connectLocal")}
                  </strong>
                  <span className="mt-1 text-xs text-slate-600 max-w-xs leading-relaxed">
                    {t("connectDescription")}
                  </span>
                  <span className="mt-3 px-3 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-xs transition-colors">
                    {isConnecting ? t("saving") : t("openFile")}
                  </span>
                </button>
              </div>

              {uploadError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold"
                >
                  <AlertCircle size={15} className="shrink-0 text-rose-700" />
                  <span>{uploadError}</span>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Parsed State */}
        <AnimatePresence>
          {isParsed && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 sm:space-y-3.5"
            >
              {/* Sample Details (Full width on mobile/tablet, visualizer hidden on mobile/tablet) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4">
                {/* Left: Sample Details */}
                <div className="w-full lg:col-span-7 bg-white rounded-xl border border-slate-200 p-2 sm:p-3 shadow-xs flex flex-col justify-between">
                  <span className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 sm:mb-1.5">
                    {t("sampleDetails")}
                  </span>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                    <MetadataField
                      label={t("customerName")}
                      value={customerName}
                      onChange={setCustomerName}
                      icon={FileText}
                      placeholder="e.g. JAJ"
                    />
                    <MetadataField
                      label={t("sampleType")}
                      value={sampleType}
                      onChange={setSampleType}
                      icon={Sparkles}
                      placeholder="e.g. RAWA"
                    />
                    <MetadataField
                      label={t("weight")}
                      value={weight}
                      onChange={setWeight}
                      icon={Scale}
                      placeholder="e.g. 1.510"
                    />
                  </div>
                </div>

                {/* Right: Composition Visualizer - Desktop Only (Hidden on Mobile & Tablet) */}
                <div className="hidden lg:flex lg:col-span-5 bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {t("compositionBreakdown")}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 font-medium">
                      {visibleMetals.length} elements
                    </span>
                  </div>

                  {/* Stacked colored spectrum bar */}
                  <div className="h-3.5 sm:h-4 rounded-md overflow-hidden bg-slate-200 flex w-full my-auto">
                    {visibleMetals.map((metal) => {
                      const val = parseFloat(metal.value) || 0;
                      if (val <= 0) return null;
                      const bgClass =
                        SPECTRUM_COLORS[metal.id.toLowerCase()] || "bg-slate-600";

                      return (
                        <div
                          key={metal.id}
                          style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                          className={`h-full ${bgClass} border-r border-white/40 transition-all hover:brightness-110 cursor-pointer`}
                          title={`${t(metal.id as any) || metal.name} (${metal.symbol}): ${val.toFixed(decimalPrecision)}%`}
                          aria-label={`${metal.name}: ${val.toFixed(decimalPrecision)}%`}
                        />
                      );
                    })}
                  </div>

                  {/* Minimal Legend Pills */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-2 text-[11px]">
                    {visibleMetals.map((metal) => {
                      const val = parseFloat(metal.value) || 0;
                      if (val <= 0) return null;
                      const dotBg =
                        SPECTRUM_COLORS[metal.id.toLowerCase()] || "bg-slate-600";

                      return (
                        <div key={metal.id} className="inline-flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-xs ${dotBg}`} aria-hidden="true" />
                          <span className="font-medium text-slate-600">
                            {t(metal.id as any) || metal.name}:
                          </span>
                          <span className="font-mono text-slate-900 font-bold">
                            {val.toFixed(decimalPrecision)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 py-0.5 sm:py-1">
                {/* Left Controls */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      {t("constituents")}
                    </h2>
                    <span
                      className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.2 sm:py-0.5 rounded ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {isVerified ? t("balanced") : t("unbalanced")}
                    </span>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-300">
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("compact")}
                      title="Compact List View (Recommended for Mobile/Tablet)"
                      className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[11px] sm:text-xs font-semibold rounded transition-all cursor-pointer ${
                        viewMode === "compact"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <List size={12} className="sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Compact</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("cards")}
                      title="Cards View"
                      className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[11px] sm:text-xs font-semibold rounded transition-all cursor-pointer ${
                        viewMode === "cards"
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LayoutGrid size={12} className="sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                  </div>

                  <label
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-md text-[10px] sm:text-xs font-semibold text-slate-700 cursor-pointer transition-colors select-none"
                    title="Automatically adjust remaining constituents proportionally to 100%"
                  >
                    <input
                      type="checkbox"
                      checked={autoBalance}
                      onChange={toggleAutoBalance}
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>Auto</span>
                  </label>

                  {!autoBalance && (
                    <Tooltip content={t("balanceNowDesc")}>
                      <button
                        type="button"
                        onClick={triggerManualBalance}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md shadow-2xs transition-all cursor-pointer animate-in fade-in duration-150"
                      >
                        <Scale size={11} className="text-amber-700" />
                        <span>{t("balanceNow")}</span>
                      </button>
                    </Tooltip>
                  )}
                </div>

                {/* Right Action Buttons: Aligned in ONE row on mobile! */}
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto sm:overflow-visible shrink-0">
                  <AddMetalModal
                    isAddingMetal={isAddingMetal}
                    setIsAddingMetal={setIsAddingMetal}
                    addMetalRef={addMetalRef}
                    availableMetals={ALL_AVAILABLE_METALS}
                    metals={metals}
                    addMetal={addMetal}
                    compact
                  />

                  <Tooltip content={t("resetBaseline")}>
                    <button
                      type="button"
                      onClick={resetToOriginal}
                      className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-md sm:rounded-lg shadow-2xs sm:shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      <RotateCcw size={11} className="sm:w-3 sm:h-3" />
                      <span>{t("resetBaseline")}</span>
                    </button>
                  </Tooltip>

                  <Tooltip content="Share report via WhatsApp">
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md sm:rounded-lg shadow-2xs sm:shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      <Share2 size={11} className="text-emerald-600 sm:w-3 sm:h-3" />
                      <span>{t("whatsAppShare")}</span>
                    </button>
                  </Tooltip>

                  <button
                    type="button"
                    onClick={() => {
                      setIsParsed(false);
                      setUploadError(null);
                    }}
                    className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-md sm:rounded-lg shadow-2xs sm:shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    {t("newReport")}
                  </button>
                </div>
              </div>

              {/* Metal Presentation: Compact Thumb-Friendly List OR Cards Grid */}
              {viewMode === "compact" ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    <div className="divide-y divide-slate-100">
                      {visibleMetals.slice(0, Math.ceil(visibleMetals.length / 2)).map((metal) => (
                        <MetalCompactRow
                          key={metal.id}
                          metal={metal}
                          lastEditedId={lastEditedId}
                          tempValues={tempValues}
                          handleValueChange={handleValueChange}
                          handleValueBlur={handleValueBlur}
                          removeMetal={removeMetal}
                          decimalPrecision={decimalPrecision}
                        />
                      ))}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {visibleMetals.slice(Math.ceil(visibleMetals.length / 2)).map((metal) => (
                        <MetalCompactRow
                          key={metal.id}
                          metal={metal}
                          lastEditedId={lastEditedId}
                          tempValues={tempValues}
                          handleValueChange={handleValueChange}
                          handleValueBlur={handleValueBlur}
                          removeMetal={removeMetal}
                          decimalPrecision={decimalPrecision}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:gap-3.5 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleMetals.map((metal) => (
                    <MetalCard
                      key={metal.id}
                      metal={metal}
                      lastEditedId={lastEditedId}
                      tempValues={tempValues}
                      handleValueChange={handleValueChange}
                      handleValueBlur={handleValueBlur}
                      removeMetal={removeMetal}
                      decimalPrecision={decimalPrecision}
                    />
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Round Auto-Balance Countdown Pill (Web Only) */}
      <AnimatePresence>
        {isParsed && autoBalance && rebalanceCountdown !== null && rebalanceCountdown > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="hidden sm:inline-flex fixed bottom-6 right-6 z-40 items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 text-white rounded-full shadow-lg border border-amber-500/40 backdrop-blur-md cursor-pointer hover:bg-slate-900 transition-colors select-none"
            onClick={() => handleValueBlur()}
            title="Click to balance now"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-200">
              {t("autoBalanceCountdown")}{" "}
              <strong className="font-mono text-amber-400 font-bold tabular-nums">
                {rebalanceCountdown}s
              </strong>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Tamper-Proof Share Modal */}
      <WhatsAppShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        customerName={customerName}
        sampleType={sampleType}
        weight={weight}
        goldPurity={metals.find((m) => m.id === "gold")?.value || "0.000"}
        karatExact={karat}
        karatDisplay={karatDisplay}
        metals={metals}
      />
    </AppLayout>
  );
}
