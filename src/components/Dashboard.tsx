import React, { useState, useRef, useCallback } from "react";
import {
  Printer,
  UploadCloud,
  LockOpen,
  Lock,
  Sparkles,
  History,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MetalValue {
  id: string;
  name: string;
  symbol: string;
  value: string;
  locked: boolean;
  color: string;
  textColor: string;

  previous?: number;
  delta?: number;
  percentChange?: number;
  changed?: boolean;

  // 🔥 NEW
  baseline?: number;
  lastAdjustedBy?: string;
  history?: {
    from: number;
    to: number;
    delta: number;
    percent: number;
    source: string;
  }[];
}
const INITIAL_METALS: MetalValue[] = [
  {
    id: "au",
    name: "Gold",
    symbol: "Au",
    value: "75.24",
    locked: false,
    color: "bg-yellow-50",
    textColor: "text-yellow-600",
  },
  {
    id: "ag",
    name: "Silver",
    symbol: "Ag",
    value: "15.10",
    locked: true,
    color: "bg-slate-100",
    textColor: "text-slate-600",
  },
  {
    id: "cu",
    name: "Copper",
    symbol: "Cu",
    value: "9.42",
    locked: false,
    color: "bg-orange-50",
    textColor: "text-orange-700",
  },
  {
    id: "zn",
    name: "Zinc",
    symbol: "Zn",
    value: "0.24",
    locked: false,
    color: "bg-teal-50",
    textColor: "text-teal-700",
  },
];

const METAL_MAP: Record<
  string,
  { name: string; color: string; textColor: string }
> = {
  GOLD: { name: "Gold", color: "bg-yellow-50", textColor: "text-yellow-600" },
  SILVER: {
    name: "Silver",
    color: "bg-slate-100",
    textColor: "text-slate-600",
  },
  COPPER: {
    name: "Copper",
    color: "bg-orange-50",
    textColor: "text-orange-700",
  },
  ZINC: { name: "Zinc", color: "bg-teal-50", textColor: "text-teal-700" },
  IRON: { name: "Iron", color: "bg-red-50", textColor: "text-red-700" },
  PLATINUM: {
    name: "Platinum",
    color: "bg-indigo-50",
    textColor: "text-indigo-700",
  },
  ALUMINUM: {
    name: "Aluminum",
    color: "bg-gray-50",
    textColor: "text-gray-600",
  },
  NICKEL: { name: "Nickel", color: "bg-blue-50", textColor: "text-blue-700" },
};

export default function Dashboard() {
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [metals, setMetals] = useState<MetalValue[]>(INITIAL_METALS);
  const [tempValues, setTempValues] = useState<Record<string, string>>({});
  const [isParsed, setIsParsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalContent, setOriginalContent] = useState("");
  const rebalanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateUpdatedContent = () => {
    if (!originalContent) return "";

    let content = originalContent;

    metals.forEach((m) => {
      const name = m.id.toUpperCase();
      const value = parseFloat(m.value || "0").toFixed(3);

      // 🔥 IMPROVED REGEX: Matches the metal name, then skips any RTF tags or whitespace, 
      // then finds the actual numeric value. This prevents breaking RTF tags like \fs24.
      const regex = new RegExp(`(${name})(?:\\s|\\\\[a-z0-9]+ ?|{[^{}]*})*?(\\d+\\.?\\d*)`, "gi");

      content = content.replace(regex, (match, p1, p2) => {
        // We want to replace only the numeric part (p2), keeping the name and any intermediate tags (p1 + tags)
        // Since the regex above captures tags in a non-capturing group, we need to find where the number starts
        const numberIndex = match.lastIndexOf(p2);
        return match.substring(0, numberIndex) + value;
      });
    });

    // 🔥 GOLD PURITY fix
    const gold = metals.find((m) => m.name.toLowerCase() === "gold");
    if (gold) {
      const goldValue = parseFloat(gold.value || "0").toFixed(2);
      content = content.replace(
        /(GOLD\s+PURITY\s*:\s*)(?:\\\\[a-z0-9]+ ?|{[^{}]*}|\s)*?(\d+\.?\d*)/i,
        `$1${goldValue}`,
      );
    }

    return content;
  };

  const updatedContent = React.useMemo(() => {
    return generateUpdatedContent();
  }, [metals, originalContent]);

  
  const handleValueChange = (id: string, newValue: string) => {
    if (newValue !== "" && !/^\d*\.?\d*$/.test(newValue)) return;

    setLastEditedId(id);
    
    // Update temporary value for immediate UI feedback
    setTempValues(prev => ({ ...prev, [id]: newValue }));

    // Debounce the global state update and rebalancing
    if (rebalanceTimeoutRef.current) {
      clearTimeout(rebalanceTimeoutRef.current);
    }

    rebalanceTimeoutRef.current = setTimeout(() => {
      // Don't commit if the value is incomplete (e.g., just a dot or empty)
      if (newValue === "" || newValue === "." || newValue.endsWith(".")) return;

      setMetals((prev) => {
        // First, update the specific metal with the new value
        const updated = prev.map((m) => (m.id === id ? { ...m, value: newValue } : m));
        // Then rebalance the others
        return rebalanceMetals(updated, id);
      });
      
      // Clear the temporary value once committed
      setTempValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 500);
  };

  const toggleLock = (id: string) => {
    setMetals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m)),
    );
  };

  const resetToOriginal = () => {
    setMetals((prev) =>
      prev.map((m) => {
        const base = m.baseline ?? parseFloat(m.value || "0");

        return {
          ...m,
          value: base.toFixed(3),

          // ❌ clear all adjustment tracking
          previous: undefined,
          delta: undefined,
          percentChange: undefined,
          changed: false,
          history: [],
          lastAdjustedBy: undefined,
        };
      }),
    );

    setLastEditedId(null);
  };

  const rebalanceMetals = (currentMetals: MetalValue[], editedId: string) => {
    const parsedMetals = currentMetals.map((m) => ({
      ...m,
      numValue: parseFloat(m.value || "0"),
    }));

    const editedMetal = parsedMetals.find((m) => m.id === editedId);
    if (!editedMetal) return currentMetals;

    const isGold = (m: any) => m.name.toLowerCase() === "gold";

    const adjustable = parsedMetals.filter(
      (m) => !m.locked && !isGold(m) && m.id !== editedId && m.numValue > 0,
    );

    const total = parsedMetals.reduce((acc, m) => acc + m.numValue, 0);
    const delta = 100 - total;

    if (Math.abs(delta) < 0.0001) return currentMetals;
    if (adjustable.length === 0) return currentMetals;

    // 🔥 NON-LINEAR weights (important)
    const weights = adjustable.map((m) => Math.pow(m.numValue, 1.7));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    return parsedMetals.map((m) => {
      const current = m.numValue;

      if (m.locked || isGold(m) || m.id === editedId || current === 0) {
        return m;
      }

      const index = adjustable.findIndex((x) => x.id === m.id);
      if (index === -1) return m;

      const weight = weights[index] / totalWeight;
      const adjustment = weight * delta;
      const newValue = current + adjustment;

      const percentChange = current === 0 ? 0 : (adjustment / current) * 100;

      const lastHistory = m.history && m.history.length > 0 ? m.history[m.history.length - 1] : null;
      let newHistory;

      if (lastHistory && lastHistory.source === editedMetal.name) {
        // Update existing entry to show total change from the start of this session
        const totalDelta = newValue - lastHistory.from;
        const totalPercent = lastHistory.from === 0 ? 0 : (totalDelta / lastHistory.from) * 100;
        
        const updatedEntry = {
          ...lastHistory,
          to: newValue,
          delta: totalDelta,
          percent: totalPercent,
        };
        newHistory = [...m.history!.slice(0, -1), updatedEntry];
      } else {
        // Add new entry for a new source
        const historyEntry = {
          from: current,
          to: newValue,
          delta: adjustment,
          percent: percentChange,
          source: editedMetal.name,
        };
        newHistory = [...(m.history || []), historyEntry];
      }

      return {
        ...m,
        value: newValue.toFixed(3),
        previous: current,
        delta: adjustment,
        percentChange,
        changed: Math.abs(adjustment) > 0.0001,
        lastAdjustedBy: editedMetal.name,
        history: newHistory,
      };
    });
  };

  // 🔥 RTF → TEXT CLEANER
  const rtfToText = (rtf: string) => {
    return rtf
      .replace(/\\par/g, "\n")
      .replace(/\\tab/g, " ")
      .replace(/\\'[0-9a-f]{2}/gi, "")
      .replace(/\\[a-z]+\d* ?/gi, "")
      .replace(/[{}]/g, "")
      .trim();
  };

  const downloadDOC = () => {
    const content = generateUpdatedContent(); // always latest

    const blob = new Blob([content], {
      type: "application/msword",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "updated_report.doc";
    a.click();

    URL.revokeObjectURL(url);
  };

  // 🔥 STRONG PARSER
  const parseFileContent = (content: string) => {
    const cleanText = content.toUpperCase();

    const orderedMetals = [
      "GOLD",
      "SILVER",
      "COPPER",
      "ZINC",
      "CADIMIUM",
      "NICKEL",
      "PALLADIUM",
      "INDIUM",
      "TIN",
      "IREDIUM",
      "RUTHENIUM",
      "TUNGESTAN",
      "PLATINUM",
      "LEAD",
      "CROMIUM",
      "MANGANESE",
      "RHODIUM",
      "IRON",
      "COBALT",
      "GALLIUM",
      "VANADIUM",
      "OSMIUM",
    ];

    const newMetals: MetalValue[] = [];

    orderedMetals.forEach((metal) => {
      // ✅ match metal even if attached to value (e.g. PALLADIUM0.00)
      const regex = new RegExp(`${metal}\\s*(\\d+\\.\\d+|\\d+)`);
      const match = cleanText.match(regex);
      if (match) {
        const value = parseFloat(match[1]);
        if (isNaN(value)) return;

        // ✅ normalize names for UI
        let normalizedName = metal
          .replace("CADIMIUM", "Cadmium")
          .replace("CROMIUM", "Chromium")
          .replace("IREDIUM", "Iridium")
          .replace("TUNGESTAN", "Tungsten")
          .replace("VANADIUM", "Vanadium");

        // Default formatting
        if (
          !["Cadmium", "Chromium", "Iridium", "Tungsten", "Vanadium"].includes(
            normalizedName,
          )
        ) {
          normalizedName = metal.charAt(0) + metal.slice(1).toLowerCase();
        }

        const symbolKey = metal.slice(0, 2);

        const info = METAL_MAP[symbolKey] || {
          name: normalizedName,
          color: "bg-slate-100",
          textColor: "text-slate-700",
        };

        newMetals.push({
          id: metal.toLowerCase(),
          name: info.name,
          symbol: symbolKey,
          value: value.toFixed(3),
          locked: false,
          color: info.color,
          textColor: info.textColor,

          baseline: value,
          history: [],
        });
      }
    });

    // ✅ GOLD PURITY override (always first)
    const goldMatch = cleanText.match(/GOLD\s+PURITY\s*:\s*(\d+\.\d+)/);

    if (goldMatch) {
      const goldValue = parseFloat(goldMatch[1]);

      const rest = newMetals.filter((m) => m.id !== "gold");

      rest.unshift({
        id: "gold",
        name: "Gold",
        symbol: "AU",
        value: goldValue.toFixed(3),
        locked: false,
        color: "bg-yellow-50",
        textColor: "text-yellow-600",
      });

      setMetals(rest);
    } else {
      setMetals(newMetals);
    }

    if (newMetals.length > 0) {
      setIsParsed(true);
      setUploadError(null);
    } else {
      setUploadError("Could not extract valid metallurgical data.");
    }
  };
  const handleFile = (file: File) => {
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".doc")) {
      setUploadError("Please upload a .txt or .doc file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      setOriginalContent(content); // 🔥 RAW

      // Only for extracting metals (keep your parser)
      const clean = content.includes("{\\rtf") ? rtfToText(content) : content;

      parseFileContent(clean);
    };

    reader.onerror = () => setUploadError("Error reading file.");
    reader.readAsText(file);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const totalAggregate = metals
    .reduce((acc, m) => acc + parseFloat(m.value || "0"), 0)
    .toFixed(2);
  const isVerified = Math.abs(parseFloat(totalAggregate) - 100) < 0.01;

  const [printHTML, setPrintHTML] = useState("");

  const rtfToHtmlForPrint = (rtf: string) => {
    if (!rtf.includes("{\\rtf")) return rtf.replace(/\n/g, "<br/>");
    
    // More robust RTF to HTML conversion
    let html = rtf;

    // Handle paragraphs and line breaks
    html = html.replace(/\\par\b/g, "<br/>");
    html = html.replace(/\\tab\b/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

    // Handle basic formatting
    html = html.replace(/\\b\b/g, "<strong>");
    html = html.replace(/\\b0\b/g, "</strong>");
    html = html.replace(/\\i\b/g, "<em>");
    html = html.replace(/\\i0\b/g, "</em>");
    html = html.replace(/\\ul\b/g, "<u>");
    html = html.replace(/\\ulnone\b/g, "</u>");

    // Remove RTF metadata and groups
    html = html
      .replace(/\\rtf1|\\ansi|\\ansicpg\d+|\\deff\d+|\\deflang\d+/g, "")
      .replace(/{\\fonttbl.*?}/g, "")
      .replace(/{\\colortbl.*?}/g, "")
      .replace(/{\\stylesheet.*?}/g, "")
      .replace(/{\\info.*?}/g, "")
      // Remove other RTF tags
      .replace(/\\\w+\d* ?/g, "")
      // Remove curly braces
      .replace(/[{}]/g, "")
      .trim();

    // Wrap in a div with proper styling
    return `<div style="font-family: 'Times New Roman', serif; line-height: 1.6; font-size: 12pt; color: #000;">${html}</div>`;
  };

  const handlePrint = () => {
    const content = generateUpdatedContent();
    const html = rtfToHtmlForPrint(content);
    setPrintHTML(html);
    
    // Increased delay to ensure state is updated before printing
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-on-background font-body">
      {/* Print-only container */}
      <div className="hidden print:block print:p-0">
        <div className="print-paper">
          <div 
            className="font-serif leading-relaxed"
            dangerouslySetInnerHTML={{ __html: printHTML }}
          />
        </div>
      </div>

      {/* Main UI (Hidden during print) */}
      <div className="print:hidden flex flex-col h-full">
        {/* TopNavBar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold tracking-tighter text-slate-900 font-headline">
            Metallurgist Pro
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <button
              onClick={handlePrint}
              disabled={!isParsed}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-2 ${
                isParsed 
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer" 
                  : "bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              <Printer size={14} />
              Print Report
            </button>
            <button
              onClick={downloadDOC}
              disabled={!isParsed}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-2 ${
                isParsed 
                  ? "bg-primary text-on-primary hover:opacity-90 cursor-pointer" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              <FileText size={14} />
              Download File
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="w-full flex h-full overflow-hidden bg-surface">
          {/* Main Column: Editor */}
          <div className="w-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight font-headline text-on-primary-fixed mb-2">
                    Report Composition
                  </h2>
                  <p className="text-on-surface-variant text-sm">
                    Fine-tune metallurgical values for the final laboratory
                    report.
                  </p>
                </div>

                {isParsed && (
                  <div className="flex items-center gap-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Aggregate
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-black font-headline ${isVerified ? "text-teal-600" : "text-red-500"}`}>
                          {totalAggregate}
                        </span>
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                    
                    <div className="h-10 w-px bg-slate-100"></div>

                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Status
                      </p>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isVerified ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"}`}>
                        {isVerified ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {isVerified ? "Verified" : "Unbalanced"}
                      </div>
                    </div>

                    <div className="h-10 w-px bg-slate-100"></div>

                    <button
                      onClick={resetToOriginal}
                      className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all flex flex-col items-center gap-1"
                      title="Reset to Original"
                    >
                      <History size={18} />
                      <span className="text-[8px] font-bold uppercase">Reset</span>
                    </button>
                  </div>
                )}
              </header>

              {/* Upload Area */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                  isDragging
                    ? "bg-secondary-container/20 border-secondary scale-[1.02]"
                    : "bg-surface-container-low border-outline-variant/30 hover:border-secondary/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".txt,.doc"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                <div className="w-12 h-12 bg-surface-container-lowest rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <UploadCloud
                    className={
                      isDragging
                        ? "text-secondary animate-bounce"
                        : "text-secondary"
                    }
                    size={24}
                  />
                </div>
                <p className="text-sm font-medium text-on-surface">
                  {isDragging
                    ? "Drop to analyze"
                    : "Drop file or click to upload .doc/.txt"}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Maximum file size: 10MB
                </p>

                <AnimatePresence>
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-4 flex items-center gap-2 text-error text-xs font-bold"
                    >
                      <AlertCircle size={14} />
                      {uploadError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Editor Section */}
              <AnimatePresence>
                {isParsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <section className="space-y-6 pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold font-headline text-on-surface">
                          Edit Metal Values
                        </h3>
                        <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded uppercase tracking-wider">
                          Live Editing
                        </span>
                      </div>
                      <div className="space-y-3">
                        {metals.map((metal) => (
                          <div
                            key={metal.id}
                            className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-lg group transition-colors hover:bg-surface-container-low"
                          >
                            <div
                              className={`w-10 h-10 rounded-lg ${metal.color} flex items-center justify-center ${metal.textColor} font-mono font-bold`}
                            >
                              {metal.symbol}
                            </div>
                            <div className="flex-1">
                              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                                {metal.name}
                              </label>
                              <div className="relative">
                                <input
                                  className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:ring-0 focus:border-secondary font-mono text-lg transition-all p-0"
                                  type="text"
                                  value={tempValues[metal.id] ?? metal.value}
                                  onChange={(e) =>
                                    handleValueChange(metal.id, e.target.value)
                                  }
                                  disabled={metal.locked}
                                />
                                <span className="absolute right-0 top-0 text-on-surface-variant font-mono">
                                  %
                                </span>
                                {metal.history && metal.history.length > 0 && (
                                  <div className="text-xs font-mono mt-1 space-y-1">
                                    {metal.history.slice(-2).map((h, idx) => (
                                      <div key={idx} className="flex gap-2">
                                        <span className="text-slate-500">
                                          {h.from.toFixed(3)} →{" "}
                                          {h.to.toFixed(3)}
                                        </span>

                                        <span
                                          className={`font-bold ${
                                            h.delta > 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          ({h.delta > 0 ? "+" : ""}
                                          {h.delta.toFixed(3)},
                                          {h.percent > 0 ? "+" : ""}
                                          {h.percent.toFixed(2)}%)
                                        </span>

                                        <span className="text-blue-500">
                                          via {h.source}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => toggleLock(metal.id)}
                              className={`p-2 transition-colors ${metal.locked ? "text-secondary" : "text-outline-variant hover:text-secondary"}`}
                            >
                              {metal.locked ? (
                                <Lock size={20} fill="currentColor" />
                              ) : (
                                <LockOpen size={20} />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Footer Controls Removed (Moved to Top) */}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
  );
}
