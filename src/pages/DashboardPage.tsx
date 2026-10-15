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
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDashboard } from "../hooks/useDashboard";
import { ALL_AVAILABLE_METALS } from "../constants/metals";
import { AppLayout } from "../components/layout/AppLayout";
import { AddMetalModal } from "../components/dashboard/AddMetalModal";
import { WhatsAppShareModal } from "../components/dashboard/WhatsAppShareModal";
import { CalculationSummary } from "../components/dashboard/CalculationSummary";
import { MetalCard } from "../components/dashboard/MetalCard";
import { MetadataField } from "../components/dashboard/MetadataField";
import { Tooltip } from "../components/common/Tooltip";
import { useLanguage } from "../lib/LanguageContext";

export default function DashboardPage() {
  const { t } = useLanguage();
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
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
    toggleLock,
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
  } = dashboard;

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
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
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
        <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {fileHandle ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                      isPersistent
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : "bg-amber-50 text-amber-800 border border-amber-300"
                    }`}
                  >
                    <HardDrive size={12} />
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
                  <span className="text-xs font-medium text-slate-500">
                    {t("localMode")}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {t("metalComposition")}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                {t("compositionSubtitle")}
              </p>
            </div>

            {/* Calculations Readout */}
            <div className="shrink-0 w-full lg:w-auto">
              <CalculationSummary
                totalAggregate={totalAggregate}
                isVerified={isVerified}
                karat={karat}
                karatDisplay={karatDisplay}
                isParsed={isParsed}
              />
            </div>
          </div>
        </section>

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
              className="space-y-4 sm:space-y-5"
            >
              {/* Sample Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  {t("sampleDetails")}
                </span>

                <div className="grid gap-3 sm:grid-cols-3">
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

              {/* Composition Breakdown Strip */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    {t("constituents")}
                  </span>
                  <span className="font-mono text-slate-500 font-medium">
                    {visibleMetals.length} elements
                  </span>
                </div>

                <div className="h-4 rounded-md overflow-hidden bg-slate-200 flex">
                  {visibleMetals.map((metal) => {
                    const val = parseFloat(metal.value) || 0;
                    if (val <= 0) return null;
                    const bgClass =
                      metal.id === "gold"
                        ? "bg-amber-500"
                        : metal.id === "silver"
                        ? "bg-slate-600"
                        : metal.id === "copper"
                        ? "bg-orange-600"
                        : metal.id === "zinc"
                        ? "bg-teal-600"
                        : metal.id === "platinum"
                        ? "bg-indigo-600"
                        : metal.id === "palladium"
                        ? "bg-cyan-700"
                        : "bg-slate-700";

                    return (
                      <Tooltip
                        key={metal.id}
                        content={`${t(metal.id as any) || metal.name} (${metal.symbol}): ${val.toFixed(3)}%`}
                        className="h-full"
                      >
                        <div
                          style={{ width: `${Math.min(100, val)}%` }}
                          className={`h-full ${bgClass} border-r border-white/40 transition-all hover:brightness-110`}
                          aria-label={`${metal.name}: ${val.toFixed(3)}%`}
                        />
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Minimal Legend */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs">
                  {visibleMetals.map((metal) => {
                    const dotBg =
                      metal.id === "gold"
                        ? "bg-amber-500"
                        : metal.id === "silver"
                        ? "bg-slate-600"
                        : metal.id === "copper"
                        ? "bg-orange-600"
                        : metal.id === "zinc"
                        ? "bg-teal-600"
                        : metal.id === "platinum"
                        ? "bg-indigo-600"
                        : metal.id === "palladium"
                        ? "bg-cyan-700"
                        : "bg-slate-700";

                    return (
                      <div key={metal.id} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-xs ${dotBg}`} aria-hidden="true" />
                        <span className="font-medium text-slate-700">
                          {t(metal.id as any) || metal.name}:
                        </span>
                        <span className="font-mono text-slate-900 font-bold">
                          {metal.value}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {t("constituents")}
                  </h2>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isVerified
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {isVerified ? t("balanced") : t("unbalanced")}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <AddMetalModal
                    isAddingMetal={isAddingMetal}
                    setIsAddingMetal={setIsAddingMetal}
                    addMetalRef={addMetalRef}
                    availableMetals={ALL_AVAILABLE_METALS}
                    metals={metals}
                    addMetal={addMetal}
                  />

                  <Tooltip content={t("resetBaseline")}>
                    <button
                      type="button"
                      onClick={resetToOriginal}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>{t("resetBaseline")}</span>
                    </button>
                  </Tooltip>

                  <Tooltip content="Share verified report via WhatsApp">
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Share2 size={12} className="text-emerald-600" />
                      <span>WhatsApp Share</span>
                    </button>
                  </Tooltip>

                  <button
                    type="button"
                    onClick={() => {
                      setIsParsed(false);
                      setUploadError(null);
                    }}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {t("newReport")}
                  </button>
                </div>
              </div>

              {/* Metal Cards Grid */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleMetals.map((metal) => (
                  <MetalCard
                    key={metal.id}
                    metal={metal}
                    lastEditedId={lastEditedId}
                    tempValues={tempValues}
                    handleValueChange={handleValueChange}
                    handleValueBlur={handleValueBlur}
                    toggleLock={toggleLock}
                    removeMetal={removeMetal}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

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
