import React, { useState, useEffect } from "react";
import { Sidebar } from "../common/Sidebar";
import { TopNav } from "../common/TopNav";

interface AppLayoutProps {
  children: React.ReactNode;
  isParsed?: boolean;
  isPersistent?: boolean;
  isSaving?: boolean;
  fileHandle?: any;
  onSaveOrDownload?: () => void;
  onPrint?: () => void;
  onReload?: () => void;
  onShareWhatsApp?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  isParsed = false,
  isPersistent = false,
  isSaving = false,
  fileHandle = null,
  onSaveOrDownload,
  onPrint,
  onReload,
  onShareWhatsApp,
}) => {
  // Sidebar remains collapsed by default under the hamburger for both desktop and mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-body flex flex-col w-full max-w-full overflow-x-hidden selection:bg-amber-200">
      {/* Off-canvas Sidebar Drawer (collapsed by default, toggled via hamburger on desktop & mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs sm:max-w-sm w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <Sidebar isMobile onClose={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <TopNav
        isParsed={isParsed}
        fileHandle={fileHandle}
        onPrint={onPrint}
        onReload={onReload}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 w-full flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
