import React from "react";
import {
  Sparkles,
  UserPlus,
  Users,
  History,
  Save,
  FileText,
  Printer as PrinterIcon,
  Plus,
  Settings,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  navigate: ReturnType<typeof useNavigate>;
  onLogout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  selectedIntakeId: string | null;
  intakes: any[];
  fileHandle: any;
  isParsed: boolean;
  isPersistent: boolean;
  isSaving: boolean;
  isVerified: boolean;
  onSaveFinalReport: () => void;
  isSavingFinalReport: boolean;
  lastSavedReportId: string | null;
  lastLinkedCustomer: any | null;
  onWhatsAppShare: () => void;
  reloadFile: () => void;
  saveToOriginalFile: () => void;
  downloadDOC: () => void;
  handlePrint: () => void;
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
  mobileMenuRef: React.RefObject<HTMLDivElement>;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  settingsRef: React.RefObject<HTMLDivElement>;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  navigate,
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  selectedIntakeId,
  intakes,
  fileHandle,
  isParsed,
  isPersistent,
  isSaving,
  isVerified,
  onSaveFinalReport,
  isSavingFinalReport,
  lastSavedReportId,
  lastLinkedCustomer,
  onWhatsAppShare,
  reloadFile,
  saveToOriginalFile,
  downloadDOC,
  handlePrint,
  showMobileMenu,
  setShowMobileMenu,
  mobileMenuRef,
  showSettings,
  setShowSettings,
  settingsRef,
}) => {
  const handleSaveWrapper = () => {
    // 1. Always attempt original save logic
    if (isPersistent) {
      saveToOriginalFile();
    } else {
      downloadDOC();
    }

    // 2. If verified and customer linked, also save to DB
    if (isVerified && selectedIntakeId) {
      onSaveFinalReport();
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-3 sm:px-6 py-2.5 w-full bg-surface-container-lowest border-b border-outline-variant/30 backdrop-blur-md bg-opacity-90">
      <div className="flex items-center gap-2 sm:gap-6 min-w-0">
        <h1
          onClick={() => navigate("/")}
          className="text-sm sm:text-lg font-bold tracking-tighter text-on-surface font-headline flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
            <Sparkles size={16} />
          </div>
          <span className="hidden xs:inline font-black uppercase italic tracking-tight">
            Metallurgist <span className="text-primary">Pro</span>
          </span>
        </h1>

        <div className="h-6 w-[1px] bg-outline-variant/30 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate("/intake")}
            className="flex items-center gap-2 px-3 py-2 bg-surface-container text-on-surface rounded-xl hover:bg-primary hover:text-on-primary transition-all text-[10px] font-black uppercase tracking-widest border border-outline-variant/20"
            title="New Customer Intake"
          >
            <UserPlus size={14} />
            <span className="hidden lg:inline">Customer Intake</span>
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border ${
              selectedIntakeId
                ? "bg-secondary text-on-secondary border-secondary shadow-lg shadow-secondary/20"
                : "bg-surface-container text-on-surface border-outline-variant/30 hover:bg-surface-container-high"
            }`}
            title="Link Customer Record"
          >
            <Users size={14} />
            <span className="hidden md:inline">
              {selectedIntakeId ? (
                <span className="flex items-center gap-2">
                  Linked:{" "}
                  <span className="font-black uppercase truncate max-w-[120px]">
                    {intakes.find((i) => i.id === selectedIntakeId)?.name ||
                      "Customer"}
                  </span>
                </span>
              ) : (
                "Link Customer"
              )}
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-1.5">
          {fileHandle && isParsed && (
            <button
              onClick={reloadFile}
              className="p-2 text-outline-variant hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              title="Reload latest from disk"
            >
              <History size={18} />
            </button>
          )}

          {isPersistent ? (
            <>
              <button
                onClick={handleSaveWrapper}
                disabled={!isParsed || isSaving || isSavingFinalReport}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                  isParsed && !isSaving && !isSavingFinalReport
                    ? "bg-primary text-on-primary hover:shadow-lg shadow-primary/20"
                    : "bg-surface-container text-outline-variant cursor-not-allowed opacity-50"
                }`}
              >
                <Save size={14} className={isSaving || isSavingFinalReport ? "animate-pulse" : ""} />
                <span>{isSaving || isSavingFinalReport ? "Saving..." : "Save"}</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={!isParsed}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                  isParsed
                    ? "bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/20"
                    : "bg-surface-container text-outline-variant cursor-not-allowed opacity-50"
                }`}
              >
                <PrinterIcon size={14} />
                <span>Print</span>
              </button>

              <button
                onClick={onWhatsAppShare}
                disabled={!isParsed || (!selectedIntakeId && !lastLinkedCustomer) || isSavingFinalReport}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                  isParsed && (selectedIntakeId || lastLinkedCustomer) && !isSavingFinalReport
                    ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
                    : "bg-surface-container text-outline-variant cursor-not-allowed opacity-50"
                }`}
              >
                <MessageCircle size={14} className={isSavingFinalReport ? "animate-pulse" : ""} />
                <span>{isSavingFinalReport ? "Saving..." : "WhatsApp"}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSaveWrapper}
                disabled={!isParsed || isSavingFinalReport}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                  isParsed && !isSavingFinalReport
                    ? "bg-primary text-on-primary hover:shadow-lg shadow-primary/20"
                    : "bg-surface-container text-outline-variant cursor-not-allowed opacity-50"
                }`}
              >
                <FileText size={14} className={isSavingFinalReport ? "animate-pulse" : ""} />
                <span>{isSavingFinalReport ? "Saving..." : "Download"}</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={!isParsed}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                  isParsed
                    ? "bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/20"
                    : "bg-surface-container text-outline-variant cursor-not-allowed opacity-50"
                }`}
              >
                <PrinterIcon size={14} />
                <span>Print</span>
              </button>

              <button
                onClick={onWhatsAppShare}
                disabled={!isParsed || (!selectedIntakeId && !lastLinkedCustomer) || isSavingFinalReport}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                  isParsed && (selectedIntakeId || lastLinkedCustomer) && !isSavingFinalReport
                    ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
                    : "bg-surface-container text-outline-variant cursor-not-allowed opacity-50"
                }`}
              >
                <MessageCircle size={14} className={isSavingFinalReport ? "animate-pulse" : ""} />
                <span>{isSavingFinalReport ? "Saving..." : "WhatsApp"}</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Actions Menu */}
        <div className="md:hidden relative" ref={mobileMenuRef}>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 bg-surface-container text-on-surface rounded-xl border border-outline-variant/20"
          >
            <Plus
              size={20}
              className={`transition-transform duration-300 ${
                showMobileMenu ? "rotate-45" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {showMobileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl z-[60] overflow-hidden p-2 space-y-1"
              >
                {fileHandle && isParsed && (
                  <button
                    onClick={() => {
                      reloadFile();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-surface-container rounded-xl transition-colors"
                  >
                    <History size={16} className="text-primary" />
                    Reload
                  </button>
                )}

                {isPersistent ? (
                  <button
                    onClick={() => {
                      handleSaveWrapper();
                      setShowMobileMenu(false);
                    }}
                    disabled={!isParsed || isSaving || isSavingFinalReport}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-surface-container rounded-xl transition-colors disabled:opacity-50"
                  >
                    <Save size={16} className={isSaving || isSavingFinalReport ? "text-primary animate-pulse" : "text-primary"} />
                    {isSaving || isSavingFinalReport ? "Saving..." : "Save"}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleSaveWrapper();
                      setShowMobileMenu(false);
                    }}
                    disabled={!isParsed || isSavingFinalReport}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-surface-container rounded-xl transition-colors disabled:opacity-50"
                  >
                    <FileText size={16} className={isSavingFinalReport ? "text-primary animate-pulse" : "text-primary"} />
                    {isSavingFinalReport ? "Saving..." : "Download"}
                  </button>
                )}

                <button
                  onClick={() => {
                    handlePrint();
                    setShowMobileMenu(false);
                  }}
                  disabled={!isParsed}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-surface-container rounded-xl transition-colors disabled:opacity-50"
                >
                  <PrinterIcon size={16} className="text-primary" />
                  Print Report
                </button>

                <button
                  onClick={() => {
                    onWhatsAppShare();
                    setShowMobileMenu(false);
                  }}
                  disabled={!isParsed || (!selectedIntakeId && !lastLinkedCustomer) || isSavingFinalReport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors disabled:opacity-50"
                >
                  <MessageCircle size={16} className={isSavingFinalReport ? "animate-pulse" : ""} />
                  {isSavingFinalReport ? "Saving..." : "WhatsApp"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-6 w-[1px] bg-outline-variant/30" />

        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-all ${
              showSettings
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "text-outline-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Settings
              size={20}
              className={showSettings ? "animate-spin-slow" : ""}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
