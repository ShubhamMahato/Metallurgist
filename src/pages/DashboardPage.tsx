import React from "react";
import {
  UploadCloud,
  Activity,
  Zap,
  AlertCircle,
  History,
  X,
  Users,
  FileText,
  Sparkles,
  LockOpen,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../hooks/useDashboard";
import { useLanguage } from "../lib/LanguageContext";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { MetalCard } from "../components/dashboard/MetalCard";
import { CalculationSummary } from "../components/dashboard/CalculationSummary";
import { AddMetalModal } from "../components/dashboard/AddMetalModal";
import { IntakeLinkModal } from "../components/dashboard/IntakeLinkModal";
import { MetadataField } from "../components/dashboard/MetadataField";
import { ALL_AVAILABLE_METALS } from "../constants/metals";

import { LogOut, Settings as SettingsIcon } from "lucide-react";

export default function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const { language, setLanguage, t } = useLanguage();
  const {
    navigate,
    lastEditedId,
    intakeSearch,
    setIntakeSearch,
    selectedIntakeId,
    setSelectedIntakeId,
    isSidebarOpen,
    setIsSidebarOpen,
    intakes,
    isIntakesLoading,
    completeIntake,
    isCompleting,
    metals,
    tempValues,
    isParsed,
    setIsParsed,
    isDragging,
    uploadError,
    setUploadError,
    karat,
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
    showSettings,
    setShowSettings,
    isConnecting,
    isSaving,
    showMobileMenu,
    setShowMobileMenu,
    fileInputRef,
    addMetalRef,
    settingsRef,
    mobileMenuRef,
    requestFilePermission,
    connectFile,
    handlePrint,
    saveToOriginalFile,
    reloadFile,
    disconnectFile,
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
    saveFinalReport,
    isSavingFinalReport,
    showIntakeLink,
    setShowIntakeLink,
  } = useDashboard();

  const [notification, setNotification] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [lastSavedReportId, setLastSavedReportId] = React.useState<string | null>(null);
  const [lastLinkedCustomer, setLastLinkedCustomer] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (selectedIntakeId) {
      const intake = intakes.find(i => i.id === selectedIntakeId);
      if (intake) {
        setLastLinkedCustomer(intake);
      }
    }
  }, [selectedIntakeId, intakes]);

  const handleSaveFinalReport = async () => {
    try {
      const result = await saveFinalReport();
      setLastSavedReportId(result.id);
      setNotification({ type: 'success', message: 'Final report saved successfully!' });
      setTimeout(() => setNotification(null), 5000);
      return result.id;
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to save final report' });
      setTimeout(() => setNotification(null), 5000);
      throw err;
    }
  };

  const handleWhatsAppShare = async () => {
    // Check if we have a linked customer or if we had one recently
    const selectedIntake = (selectedIntakeId ? intakes.find(i => i.id === selectedIntakeId) : null) || lastLinkedCustomer;
    
    if (!selectedIntake) {
      setNotification({ type: 'error', message: 'No customer linked to share report' });
      return;
    }

    let reportId = lastSavedReportId;
    
    // If not saved yet, save it first
    if (!reportId) {
      try {
        reportId = await handleSaveFinalReport();
      } catch (e) {
        // Error already handled in handleSaveFinalReport
        return;
      }
    }

    if (!reportId) return;
    
    const domain = window.location.origin;
    const reportUrl = `${domain}/report/${reportId}`;
    const message = `View your analysis report: ${reportUrl}`;
    const whatsappUrl = `https://wa.me/${selectedIntake.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-screen overflow-x-hidden overflow-y-hidden bg-background text-on-background font-body">
      <div className="flex flex-col h-full">
        <DashboardHeader
          navigate={navigate}
          onLogout={onLogout}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          selectedIntakeId={selectedIntakeId}
          intakes={intakes}
          fileHandle={fileHandle}
          isParsed={isParsed}
          isPersistent={isPersistent}
          isSaving={isSaving}
          isVerified={isVerified}
          onSaveFinalReport={handleSaveFinalReport}
          isSavingFinalReport={isSavingFinalReport}
          lastSavedReportId={lastSavedReportId}
          lastLinkedCustomer={lastLinkedCustomer}
          onWhatsAppShare={handleWhatsAppShare}
          reloadFile={reloadFile}
          saveToOriginalFile={saveToOriginalFile}
          downloadDOC={downloadDOC}
          handlePrint={handlePrint}
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
          mobileMenuRef={mobileMenuRef}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          settingsRef={settingsRef}
          onShowIntakeLink={() => setShowIntakeLink(true)}
        />

        {/* Settings Dropdown Content (Mobile/Tablet positioning handled in Header, but logic here) */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed right-6 top-16 w-64 bg-surface-container-highest rounded-2xl shadow-2xl border border-outline-variant/30 p-2 z-[100] hidden md:block"
            >
              <div className="px-3 py-2 border-b border-outline-variant/30 mb-1">
                <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                  {t('language')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1 px-2 pb-2 border-b border-outline-variant/30 mb-1">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'हिंदी' },
                  { id: 'mr', label: 'मराठी' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id as any)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      language === lang.id
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-outline hover:bg-surface-container-high"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              <div className="px-3 py-2 border-b border-outline-variant/30 mb-1">
                <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                  {t('changeFile')}
                </p>
              </div>
              <button
                onClick={() => {
                  connectFile();
                  setShowSettings(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-surface-container rounded-xl transition-colors flex items-center gap-3 text-xs font-bold text-on-surface"
              >
                <History size={16} className="text-primary" />
                <div className="flex flex-col">
                  <span>Change File</span>
                  <span className="text-[9px] font-medium text-outline-variant">
                    Select a different report
                  </span>
                </div>
              </button>
              <button
                onClick={disconnectFile}
                className="w-full text-left px-3 py-2.5 hover:bg-error/10 rounded-xl transition-colors flex items-center gap-3 text-xs font-bold text-error"
              >
                <X size={16} />
                <div className="flex flex-col">
                  <span>Disconnect File</span>
                  <span className="text-[9px] font-medium text-error/60">
                    Stop persistent sync
                  </span>
                </div>
              </button>
              <button
                onClick={onLogout}
                className="w-full text-left px-3 py-2.5 hover:bg-error/10 rounded-xl transition-colors flex items-center gap-3 text-xs font-bold text-error mt-1 border-t border-outline-variant/10"
              >
                <LogOut size={16} />
                <div className="flex flex-col">
                  <span>Sign Out</span>
                  <span className="text-[9px] font-medium text-error/60">
                    Exit laboratory system
                  </span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 overflow-hidden relative">
          <DashboardSidebar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            intakeSearch={intakeSearch}
            setIntakeSearch={setIntakeSearch}
            isIntakesLoading={isIntakesLoading}
            intakes={intakes}
            selectedIntakeId={selectedIntakeId}
            setSelectedIntakeId={setSelectedIntakeId}
            isCompleting={isCompleting}
            completeIntake={completeIntake}
            onShowIntakeLink={() => setShowIntakeLink(true)}
          />

          <main className="flex-1 h-full overflow-hidden bg-surface relative">
            <div className="w-full h-full flex flex-col p-3 sm:p-8 overflow-y-auto custom-scrollbar relative bg-surface">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(var(--color-primary-rgb),0.12),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(var(--color-secondary-rgb),0.12),transparent_40%)]"></div>
                <div
                  className="absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]"
                  style={{
                    backgroundImage:
                      "radial-gradient(#000 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                ></div>
              </div>

              <div className="max-w-7xl mx-auto w-full space-y-6 pb-12 relative z-10">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".txt,.doc"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFile(file);
                      e.target.value = "";
                    }
                  }}
                />

                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest">
                      <Activity size={10} className="animate-pulse" />
                      {fileHandle
                        ? t('connectedReport')
                        : t('liveAnalysis')}
                    </div>
                    <h2 className="text-3xl font-black tracking-tight font-headline text-on-surface leading-tight">
                      {fileHandle ? (
                        <>
                          {t('connectedReport').split(' ')[0]} <span className="text-primary">{t('connectedReport').split(' ')[1]}</span>
                        </>
                      ) : (
                        <>
                          {t('reportComposition').split(' ')[0]} <span className="text-primary">{t('reportComposition').split(' ')[1]}</span>
                        </>
                      )}
                    </h2>
                    {selectedIntakeId && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col gap-3 p-4 rounded-3xl bg-surface-container-highest/50 border border-primary/20 shadow-xl backdrop-blur-md relative overflow-hidden group"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-2 text-primary">
                            <Users size={16} className="text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('activeCase')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setShowIntakeLink(true)}
                              className="p-1.5 bg-secondary/10 text-secondary rounded-xl hover:bg-secondary hover:text-white transition-all border border-secondary/20"
                              title={t('shareIntake')}
                            >
                              <Share2 size={12} />
                            </button>
                            <button 
                              onClick={() => setSelectedIntakeId(null)}
                              className="p-1.5 hover:bg-error/10 rounded-xl text-outline-variant hover:text-error transition-all"
                              title={t('unlink')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 relative z-10">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest mb-0.5">{t('customerName')}</span>
                            <p className="text-base font-black text-on-surface uppercase tracking-tight">
                              {intakes.find(i => i.id === selectedIntakeId)?.name}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-8">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-outline uppercase tracking-widest mb-0.5">{t('mobileNumber')}</span>
                              <p className="text-xs font-mono text-primary font-black flex items-center gap-1.5">
                                {intakes.find(i => i.id === selectedIntakeId)?.phone_number}
                              </p>
                            </div>
                            
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-outline uppercase tracking-widest mb-0.5">{t('intakeWeight')}</span>
                              <p className="text-xs font-mono text-primary font-black flex items-center gap-1.5">
                                {intakes.find(i => i.id === selectedIntakeId)?.gold_weight}g
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {fileHandle && (
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-outline-variant font-mono flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPersistent
                                ? "bg-green-500 animate-pulse"
                                : "bg-yellow-500"
                            }`}
                          />
                          {isPersistent ? "Connected:" : "Access Required:"}{" "}
                          {fileHandle.name}
                        </p>
                        {!isPersistent && (
                          <button
                            onClick={requestFilePermission}
                            className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
                          >
                            <LockOpen size={10} />
                            Grant Access to Sync
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <CalculationSummary
                    totalAggregate={totalAggregate}
                    isVerified={isVerified}
                    karat={karat}
                    resetToOriginal={resetToOriginal}
                    isParsed={isParsed}
                    onSaveFinalReport={handleSaveFinalReport}
                    isSavingFinalReport={isSavingFinalReport}
                  />
                </header>

                <AnimatePresence>
                  {notification && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`fixed top-20 right-6 z-[200] px-6 py-3 rounded-2xl shadow-lg font-bold text-sm flex items-center gap-3 ${
                        notification.type === 'success' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {notification.type === 'success' ? <Zap size={18} /> : <AlertCircle size={18} />}
                      {notification.message}
                      <button onClick={() => setNotification(null)} className="ml-4 opacity-70 hover:opacity-100">
                        <X size={16} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {!isParsed && (
                    <motion.div
                      initial={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                      <motion.div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`group relative border-2 border-dashed rounded-3xl p-10 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                          isDragging
                            ? "bg-secondary-container/20 border-secondary scale-[1.01]"
                            : "bg-surface-container-low border-outline-variant/30 hover:border-secondary/50 hover:bg-surface-container-lowest"
                        }`}
                      >
                        <div className="w-12 h-12 bg-surface-container-lowest rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-outline-variant/20">
                          <UploadCloud
                            className={
                              isDragging
                                ? "text-secondary animate-bounce"
                                : "text-secondary"
                            }
                            size={24}
                          />
                        </div>
                        <p className="text-sm font-bold text-on-surface">
                          One-time Upload
                        </p>
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Drop report or click to upload
                        </p>
                      </motion.div>

                      <motion.div
                        onClick={connectFile}
                        className={`group relative border-2 border-dashed rounded-3xl p-10 transition-all flex flex-col items-center justify-center text-center cursor-pointer bg-primary/5 border-primary/30 hover:border-primary hover:bg-primary/10 ${
                          isConnecting ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <div className="w-12 h-12 bg-surface-container-lowest rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-primary/20">
                          <Zap className="text-primary" size={24} />
                        </div>
                        <p className="text-sm font-bold text-primary">
                          {isConnecting
                            ? "Connecting..."
                            : "Persistent Connection"}
                        </p>
                        <p className="text-[10px] text-primary/70 mt-1">
                          Auto-syncs when file changes on disk
                        </p>
                      </motion.div>

                      {uploadError && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="md:col-span-2 flex items-center justify-center gap-2 text-error text-xs font-bold bg-error-container/50 px-3 py-1.5 rounded-full"
                        >
                          <AlertCircle size={14} />
                          {uploadError}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isParsed && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="space-y-6 relative z-30"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-sm relative z-50">
                        <MetadataField
                          label={t('customerName')}
                          value={customerName}
                          onChange={setCustomerName}
                          icon={FileText}
                          placeholder={t('customerName')}
                        />
                        <MetadataField
                          label={t('sampleType')}
                          value={sampleType}
                          onChange={setSampleType}
                          icon={Sparkles}
                          placeholder={t('sampleType')}
                        />
                        <MetadataField
                          label={t('weight')}
                          value={weight}
                          onChange={setWeight}
                          icon={Activity}
                          placeholder={t('weight')}
                        />
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-4 relative z-40">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black font-headline text-on-surface">
                              {t('constituents')}
                            </h3>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isVerified
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-red-500"
                                }`}
                              ></div>
                              <span className="text-[9px] font-black text-outline uppercase tracking-widest">
                                {isVerified ? t('balanced') : t('unbalanced')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 relative z-50">
                            <AddMetalModal
                              isAddingMetal={isAddingMetal}
                              setIsAddingMetal={setIsAddingMetal}
                              addMetalRef={addMetalRef}
                              availableMetals={ALL_AVAILABLE_METALS}
                              metals={metals}
                              addMetal={addMetal}
                            />

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsParsed(false);
                                setUploadError(null);
                              }}
                              className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer p-3 -m-3 bg-white/5 rounded-lg border border-transparent hover:border-primary/20 transition-all"
                            >
                              <UploadCloud size={12} />
                              {t('uploadNew')}
                            </button>
                          </div>
                        </div>

                        <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden flex shadow-inner border border-white/20">
                          {metals
                            .filter(
                              (m) =>
                                (m.baseline ?? 0) > 0 ||
                                parseFloat(m.value) > 0 ||
                                m.isManual
                            )
                            .map((metal) => (
                              <motion.div
                                key={`bar-${metal.id}`}
                                title={`${metal.name}: ${metal.value}%`}
                                initial={{ width: 0 }}
                                animate={{ width: `${metal.value}%` }}
                                className="relative h-full"
                                style={{
                                  backgroundColor:
                                    metal.id === "gold"
                                      ? "#EAB308"
                                      : metal.id === "silver"
                                      ? "#94A3B8"
                                      : metal.id === "copper"
                                      ? "#EA580C"
                                      : "#64748B",
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                              </motion.div>
                            ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                        {metals
                          .filter(
                            (m) =>
                              (m.baseline ?? 0) > 0 ||
                              parseFloat(m.value) > 0 ||
                              m.isManual
                          )
                          .map((metal) => (
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      </div>
      <IntakeLinkModal 
        isOpen={showIntakeLink}
        onClose={() => setShowIntakeLink(false)}
      />
    </div>
  );
}
