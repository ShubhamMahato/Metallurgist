import React from "react";
import {
  Activity,
  AlertCircle,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDashboard } from "../hooks/useDashboard";
import { ALL_AVAILABLE_METALS } from "../constants/metals";
import { AddMetalModal } from "../components/dashboard/AddMetalModal";
import { CalculationSummary } from "../components/dashboard/CalculationSummary";
import { MetalCard } from "../components/dashboard/MetalCard";
import { MetadataField } from "../components/dashboard/MetadataField";

export default function DashboardPage() {
  const dashboard = useDashboard();
  const {
    lastEditedId, metals, tempValues, isParsed, setIsParsed, isDragging,
    uploadError, setUploadError, karat, karatDisplay, customerName,
    setCustomerName, weight, setWeight, sampleType, setSampleType,
    isAddingMetal, setIsAddingMetal, fileHandle, isPersistent, isConnecting,
    isSaving, fileInputRef, addMetalRef, requestFilePermission, connectFile,
    handlePrint, saveToOriginalFile, reloadFile, handleValueChange,
    handleValueBlur, toggleLock, removeMetal, resetToOriginal, downloadDOC,
    handleFile, onDragOver, onDragLeave, onDrop, totalAggregate, isVerified,
    addMetal,
  } = dashboard;

  const saveOrDownload = () => {
    if (isPersistent) saveToOriginalFile();
    else downloadDOC();
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <header className="sticky top-0 z-50 border-b border-outline-variant/30 bg-surface-container-lowest/95 backdrop-blur px-4 sm:px-8 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20"><Sparkles size={18} /></div>
            <div>
              <h1 className="text-base font-black uppercase italic tracking-tight">Metallurgist <span className="text-primary">Pro</span></h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-outline">Local composition calculator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fileHandle && isParsed && <button onClick={reloadFile} className="rounded-xl p-2 text-outline hover:bg-primary/10 hover:text-primary" title="Reload report"><RefreshCw size={18} /></button>}
            <button onClick={saveOrDownload} disabled={!isParsed || isSaving} className="hidden sm:flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary disabled:opacity-50">
              {isPersistent ? <FileText size={14} /> : <Download size={14} />}{isSaving ? "Saving" : isPersistent ? "Save" : "Download"}
            </button>
            <button onClick={handlePrint} disabled={!isParsed} className="hidden sm:flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"><Printer size={14} />Print</button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl overflow-hidden px-4 py-8 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(var(--color-primary-rgb),0.10),transparent_35%),radial-gradient(circle_at_100%_100%,rgba(var(--color-secondary-rgb),0.10),transparent_35%)]" />
        <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.doc" onChange={(event) => { const file = event.target.files?.[0]; if (file) { handleFile(file); event.target.value = ""; } }} />

        <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-primary"><Activity size={11} /> Browser-only analysis</div>
            <h2 className="text-3xl font-black tracking-tight">Metal <span className="text-primary">composition</span></h2>
            <p className="mt-1 max-w-xl text-sm text-outline">Upload a report or adjust the sample values directly. Your data stays in this browser; no account or server is used.</p>
            {fileHandle && <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-outline"><span className={`h-2 w-2 rounded-full ${isPersistent ? "bg-green-500" : "bg-yellow-500"}`} />{isPersistent ? "Connected local report" : "File access needs permission"}{!isPersistent && <button onClick={requestFilePermission} className="font-bold text-primary underline">Grant access</button>}</div>}
          </div>
          <CalculationSummary totalAggregate={totalAggregate} isVerified={isVerified} karat={karat} karatDisplay={karatDisplay} isParsed={isParsed} />
        </section>

        <AnimatePresence>
          {!isParsed && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 md:grid-cols-2">
              <button onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => fileInputRef.current?.click()} className={`flex min-h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${isDragging ? "border-secondary bg-secondary/10" : "border-outline-variant/30 bg-surface-container-low hover:border-secondary/60"}`}>
                <UploadCloud size={30} className="mb-4 text-secondary" /><strong>Upload a report</strong><span className="mt-1 text-xs text-outline">Drop a .txt or .doc report here, or choose a file.</span>
              </button>
              <button onClick={connectFile} disabled={isConnecting} className="flex min-h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center transition hover:border-primary hover:bg-primary/10 disabled:opacity-50">
                <Zap size={30} className="mb-4 text-primary" /><strong className="text-primary">Connect a local report</strong><span className="mt-1 text-xs text-primary/70">Keep a browser-approved file connected for local saving.</span>
              </button>
              {uploadError && <div className="md:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-error-container px-4 py-3 text-sm font-bold text-error"><AlertCircle size={16} />{uploadError}</div>}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isParsed && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid gap-4 rounded-3xl border border-outline-variant/20 bg-white/45 p-5 backdrop-blur sm:grid-cols-3">
                <MetadataField label="Customer name" value={customerName} onChange={setCustomerName} icon={FileText} placeholder="Customer name" />
                <MetadataField label="Sample type" value={sampleType} onChange={setSampleType} icon={Sparkles} placeholder="Sample type" />
                <MetadataField label="Weight" value={weight} onChange={setWeight} icon={Activity} placeholder="Weight" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><h3 className="text-lg font-black">Constituents</h3><p className={`text-[10px] font-black uppercase tracking-widest ${isVerified ? "text-green-600" : "text-red-600"}`}>{isVerified ? "Balanced at 100%" : "Needs balancing"}</p></div>
                <div className="flex items-center gap-4"><AddMetalModal isAddingMetal={isAddingMetal} setIsAddingMetal={setIsAddingMetal} addMetalRef={addMetalRef} availableMetals={ALL_AVAILABLE_METALS} metals={metals} addMetal={addMetal} /><button onClick={resetToOriginal} className="text-[10px] font-black uppercase tracking-widest text-outline hover:text-primary">Reset values</button><button onClick={() => { setIsParsed(false); setUploadError(null); }} className="text-[10px] font-black uppercase tracking-widest text-primary">New report</button></div>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full border border-white/20 bg-surface-container-high">
                {metals.filter((metal) => (metal.baseline ?? 0) > 0 || parseFloat(metal.value) > 0 || metal.isManual).map((metal) => <div key={metal.id} style={{ width: `${metal.value}%`, backgroundColor: metal.id === "gold" ? "#EAB308" : metal.id === "silver" ? "#94A3B8" : metal.id === "copper" ? "#EA580C" : "#64748B" }} />)}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {metals.filter((metal) => (metal.baseline ?? 0) > 0 || parseFloat(metal.value) > 0 || metal.isManual).map((metal) => <MetalCard key={metal.id} metal={metal} lastEditedId={lastEditedId} tempValues={tempValues} handleValueChange={handleValueChange} handleValueBlur={handleValueBlur} toggleLock={toggleLock} removeMetal={removeMetal} />)}
              </div>
              <div className="flex gap-3 sm:hidden"><button onClick={saveOrDownload} className="flex-1 rounded-xl bg-primary py-3 text-[10px] font-black uppercase tracking-widest text-on-primary">{isPersistent ? "Save" : "Download"}</button><button onClick={handlePrint} className="rounded-xl border border-outline-variant/30 px-4"><Printer size={18} /></button></div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
