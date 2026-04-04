import React, { useState, useRef, useCallback } from "react";
import {
  Printer,
  UploadCloud,
  LockOpen,
  Lock,
  History,
  CheckCircle2,
  FileText,
  AlertCircle,
  Sparkles,
  Coins,
  Zap,
  Gem,
  Activity,
  ShieldCheck,
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
    value: "75.240",
    locked: true,
    color: "bg-yellow-50",
    textColor: "text-yellow-600",
    baseline: 75.240,
  },
  {
    id: "ag",
    name: "Silver",
    symbol: "Ag",
    value: "15.100",
    locked: false,
    color: "bg-slate-100",
    textColor: "text-slate-600",
    baseline: 15.100,
  },
  {
    id: "cu",
    name: "Copper",
    symbol: "Cu",
    value: "9.420",
    locked: false,
    color: "bg-orange-50",
    textColor: "text-orange-700",
    baseline: 9.420,
  },
  {
    id: "zn",
    name: "Zinc",
    symbol: "Zn",
    value: "0.240",
    locked: false,
    color: "bg-teal-50",
    textColor: "text-teal-700",
    baseline: 0.240,
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
  const [karat, setKarat] = useState<string>("0");
  const [baselineKarat, setBaselineKarat] = useState<string>("0");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalContent, setOriginalContent] = useState("");
  const rebalanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateKarat = (goldPercent: number) => {
    return ((goldPercent * 24) / 100).toFixed(2);
  };

  const generateUpdatedContent = () => {
    if (!originalContent) return "";

    let content = originalContent;

    metals.forEach((m) => {
      const name = m.id.toUpperCase();
      const value = parseFloat(m.value || "0").toFixed(3);

      const regex = new RegExp(`(${name})(?:\\s|\\\\[a-z0-9]+ ?|{[^{}]*})*?(\\d+\\.?\\d*)`, "gi");

      content = content.replace(regex, (match, p1, p2) => {
        const numberIndex = match.lastIndexOf(p2);
        return match.substring(0, numberIndex) + value;
      });
    });

    // 🔥 GOLD PURITY fix
    const gold = metals.find((m) => m.name.toLowerCase() === "gold");
    if (gold) {
      const goldValue = parseFloat(gold.value || "0");
      content = content.replace(
        /(GOLD\s+PURITY\s*:\s*)(?:\\\\[a-z0-9]+ ?|{[^{}]*}|\s)*?(\d+\.?\d*)/i,
        `$1${goldValue.toFixed(2)}`,
      );

      // 🔥 KARAT fix
      const newKarat = calculateKarat(goldValue);
      content = content.replace(
        /(KARAT\s*:\s*)(?:\\\\[a-z0-9]+ ?|{[^{}]*}|\s)*?(\d+\.?\d*)/i,
        `$1${newKarat}`,
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

      let processedValue = newValue;
      const numValue = parseFloat(newValue);
      
      // 🔥 If value is 100 or more, force it to exactly 100.000
      if (numValue >= 100) {
        processedValue = "100.000";
      }

      setMetals((prev) => {
        // Update Karat if Gold changed
        if (id === "gold") {
          setKarat(calculateKarat(parseFloat(processedValue)));
        }

        // Pass the previous state and the new value to rebalanceMetals
        return rebalanceMetals(prev, id, processedValue);
      });
      
      // Clear the temporary value once committed
      setTempValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 1000);
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
          locked: m.id === "gold" ? true : m.locked,
          previous: undefined,
          delta: undefined,
          percentChange: undefined,
          changed: false,
          history: [],
          lastAdjustedBy: undefined,
        };
      }),
    );

    setKarat(baselineKarat);
    setTempValues({}); // 🔥 CRITICAL: Clear temp values so inputs reset
    setLastEditedId(null);
  };

  const rebalanceMetals = (prevMetals: MetalValue[], editedId: string, newValueStr: string) => {
    const newValueNum = parseFloat(newValueStr);
    
    let parsedMetals = prevMetals.map((m) => ({
      ...m,
      numValue: m.id === editedId ? newValueNum : parseFloat(m.value || "0"),
    }));

    const editedMetal = parsedMetals.find((m) => m.id === editedId);
    if (!editedMetal) return prevMetals;

    // Requirement: Only adjust metals that had > 0 quantity at upload AND are not locked/edited
    // 🔥 Special Rule: Gold never adjusts automatically when other metals are edited.
    const isAdjustable = (m: any) => 
      !m.locked && 
      m.id !== editedId && 
      (m.baseline ?? 0) > 0 && 
      m.name.toLowerCase() !== "gold";

    let delta = 100 - parsedMetals.reduce((acc, m) => acc + m.numValue, 0);

    // Iterative distribution to handle clamping and ensure aggregate is exactly 100
    let attempts = 0;
    while (Math.abs(delta) > 0.0001 && attempts < 10) {
      attempts++;
      const adjustable = parsedMetals.filter(m => {
        if (!isAdjustable(m)) return false;
        if (delta < 0 && m.numValue <= 0) return false; // Can't decrease further
        if (delta > 0 && m.numValue >= 100) return false; // Can't increase further
        return true;
      });

      if (adjustable.length === 0) break;

      // Weights based on current quantity (proportional distribution)
      // If current quantity is 0, use baseline as fallback for distribution
      const weights = adjustable.map(m => m.numValue || m.baseline || 1);
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      let remainingDelta = delta;
      parsedMetals = parsedMetals.map(m => {
        const adjIndex = adjustable.findIndex(a => a.id === m.id);
        if (adjIndex === -1) return m;

        const share = (weights[adjIndex] / totalWeight) * delta;
        let newValue = m.numValue + share;
        
        // Clamp to 0-100 range
        if (newValue < 0) newValue = 0;
        if (newValue > 100) newValue = 100;
        
        remainingDelta -= (newValue - m.numValue);
        return { ...m, numValue: newValue };
      });
      
      delta = remainingDelta;
    }

    // Final pass to update strings and history
    return parsedMetals.map(m => {
      const prev = prevMetals.find(x => x.id === m.id)!;
      const prevValue = parseFloat(prev.value || "0");
      const adjustment = m.numValue - prevValue;
      const percentChange = prevValue === 0 ? 0 : (adjustment / prevValue) * 100;

      const lastHistory = m.history && m.history.length > 0 ? m.history[m.history.length - 1] : null;
      let newHistory = m.history || [];

      if (Math.abs(adjustment) > 0.0001) {
        // Source is either the user (for the edited metal) or the edited metal (for rebalanced ones)
        const sourceName = m.id === editedId ? "User Edit" : editedMetal.name;

        if (lastHistory && lastHistory.source === sourceName) {
          const totalDelta = m.numValue - lastHistory.from;
          const totalPercent = lastHistory.from === 0 ? 0 : (totalDelta / lastHistory.from) * 100;
          const updatedEntry = { ...lastHistory, to: m.numValue, delta: totalDelta, percent: totalPercent };
          newHistory = [...newHistory.slice(0, -1), updatedEntry];
        } else {
          newHistory = [...newHistory, { from: prevValue, to: m.numValue, delta: adjustment, percent: percentChange, source: sourceName }];
        }
      }

      return {
        ...m,
        value: m.numValue.toFixed(3),
        previous: prevValue,
        delta: adjustment,
        percentChange,
        changed: Math.abs(adjustment) > 0.0001,
        lastAdjustedBy: m.id === editedId ? "User" : editedMetal.name,
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
          locked: metal.toLowerCase() === "gold",
          color: info.color,
          textColor: info.textColor,

          baseline: value,
          history: [],
        });
      }
    });

    // ✅ GOLD PURITY override (always first)
    const goldMatch = cleanText.match(/GOLD\s+PURITY\s*:\s*(\d+\.\d+)/);
    const karatMatch = cleanText.match(/KARAT\s*:\s*(\d+\.\d+|\d+)/);

    if (karatMatch) {
      setKarat(karatMatch[1]);
      setBaselineKarat(karatMatch[1]);
    }

    if (goldMatch) {
      const goldValue = parseFloat(goldMatch[1]);
      
      // If karat wasn't in file, calculate it
      if (!karatMatch) {
        const calculated = calculateKarat(goldValue);
        setKarat(calculated);
        setBaselineKarat(calculated);
      }

      const rest = newMetals.filter((m) => m.id !== "gold");

      rest.unshift({
        id: "gold",
        name: "Gold",
        symbol: "AU",
        value: goldValue.toFixed(3),
        locked: true,
        color: "bg-yellow-50",
        textColor: "text-yellow-600",
        baseline: goldValue,
        history: [],
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

 
  const rtfToHtmlForPrint = (rtf: string) => {
    if (!rtf.includes("{\\rtf")) return rtf.replace(/\n/g, "<br/>");
    
    let html = rtf;

    // 1. Handle Tables (Basic support for lab reports)
    // RTF rows start with \trowd and end with \row
    html = html.replace(/\\trowd([\s\S]*?)\\row/g, (match, rowContent) => {
      let cells = rowContent.split(/\\cell/);
      let rowHtml = '<tr>';
      cells.forEach((cell, i) => {
        if (i === cells.length - 1) return; // Skip the part after the last \cell
        // Clean cell content but keep some basic formatting if possible
        let clean = cell.replace(/\\[a-z]+\d* ?/gi, "").replace(/[{}]/g, "").trim();
        rowHtml += `<td style="border: 1px solid #ccc; padding: 8px; min-width: 50px; vertical-align: top;">${clean}</td>`;
      });
      rowHtml += '</tr>';
      return `<table style="border-collapse: collapse; width: 100%; margin: 15px 0; border: 1px solid #ccc;">${rowHtml}</table>`;
    });

    // 2. Handle Paragraphs and Line Breaks
    html = html.replace(/\\par\b/g, "<br/>");
    html = html.replace(/\\line\b/g, "<br/>");
    html = html.replace(/\\tab\b/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

    // 3. Handle Basic Formatting
    html = html.replace(/\\b\b/g, "<strong>");
    html = html.replace(/\\b0\b/g, "</strong>");
    html = html.replace(/\\i\b/g, "<em>");
    html = html.replace(/\\i0\b/g, "</em>");

    // 4. Final Cleanup of remaining RTF tags
    html = html
      .replace(/\\rtf1[\s\S]*?{\\fonttbl[\s\S]*?}/g, "")
      .replace(/{\\colortbl[\s\S]*?}/g, "")
      .replace(/{\\stylesheet[\s\S]*?}/g, "")
      .replace(/{\\info[\s\S]*?}/g, "")
      .replace(/\\[a-z]+\d* ?/gi, "")
      .replace(/[{}]/g, "")
      .trim();

    return `
      <div style="
        font-family: 'Times New Roman', serif; 
        line-height: 1.5; 
        font-size: 11pt; 
        color: #000;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
        background: white;
      ">
        ${html}
      </div>
    `;
  };

  const handlePrint = () => {
    const content = generateUpdatedContent();
    const html = rtfToHtmlForPrint(content);
    
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Metallurgist Report</title>
            <style>
              @page { margin: 20mm; }
              body { margin: 0; padding: 0; background: white; }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `);
      doc.close();

      // Wait for content to load and then print
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Remove the iframe after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-on-background font-body">
      {/* Main UI */}
      <div className="flex flex-col h-full">
        {/* TopNavBar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 w-full bg-surface-container-lowest border-b border-outline-variant/30">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold tracking-tighter text-on-surface font-headline flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
              <Sparkles size={18} />
            </div>
            Metallurgist Pro
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <button
              onClick={downloadDOC}
              disabled={!isParsed}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                isParsed 
                  ? "bg-primary text-on-primary hover:opacity-90 cursor-pointer" 
                  : "bg-surface-container text-outline-variant cursor-not-allowed opacity-60"
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
          <div className="w-full flex flex-col p-8 overflow-y-auto custom-scrollbar relative bg-surface">
            {/* Background Pattern & Gradients */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(var(--color-primary-rgb),0.12),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(var(--color-secondary-rgb),0.12),transparent_40%)]"></div>
              <div className="absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" 
                   style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            </div>

            <div className="max-w-6xl mx-auto w-full space-y-6 pb-12 relative z-10">
              {/* Hidden file input for programmatic access */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".txt,.doc"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFile(file);
                    // Clear the value so the same file can be uploaded again if needed
                    e.target.value = '';
                  }
                }}
              />
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest">
                    <Activity size={10} className="animate-pulse" />
                    Live Analysis System
                  </div>
                  <h2 className="text-3xl font-black tracking-tight font-headline text-on-surface leading-tight">
                    Report <span className="text-primary">Composition</span>
                  </h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-3"
                     style={{ opacity: isParsed ? 1 : 0, transform: isParsed ? 'none' : 'translateY(10px)', transition: 'all 0.5s ease', pointerEvents: isParsed ? 'auto' : 'none' }}>
                  
                  <div className="flex items-center gap-3 bg-white/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/40 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[8px] font-black text-outline uppercase tracking-widest">Aggregate</p>
                      <div className="flex items-baseline gap-0.5">
                        <motion.span 
                          key={totalAggregate}
                          className={`text-xl font-black font-headline ${isVerified ? "text-green-600" : "text-red-600"}`}
                        >
                          {totalAggregate}
                        </motion.span>
                        <span className="text-[8px] font-bold text-outline">%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-white/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/40 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Gem size={16} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[8px] font-black text-outline uppercase tracking-widest">Karat</p>
                      <div className="flex items-baseline gap-0.5">
                        <motion.span 
                          key={karat}
                          className="text-xl font-black font-headline text-primary"
                        >
                          {karat}
                        </motion.span>
                        <span className="text-[8px] font-black text-outline uppercase tracking-widest ml-0.5">K</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={resetToOriginal}
                    className="flex items-center gap-3 bg-white/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/40 shadow-sm hover:bg-primary-fixed transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-outline-variant/20 flex items-center justify-center text-outline group-hover:text-primary transition-colors">
                      <History size={16} className="group-hover:rotate-[-45deg] transition-transform" />
                    </div>
                    <span className="text-sm font-black font-headline text-on-surface group-hover:text-primary transition-colors">Reset</span>
                  </button>
                </div>
              </header>

              {/* Upload Area - Only show if NOT parsed or if user wants to upload new */}
              <AnimatePresence>
                {!isParsed && (
                  <motion.div
                    initial={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
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
                      Drop laboratory report or click to upload
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      Supports .doc and .txt formats (Max 10MB)
                    </p>

                    {uploadError && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-4 flex items-center gap-2 text-error text-xs font-bold bg-error-container/50 px-3 py-1.5 rounded-full"
                      >
                        <AlertCircle size={14} />
                        {uploadError}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Editor Section */}
              <AnimatePresence>
                {isParsed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="space-y-4 relative z-20"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between relative z-30">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black font-headline text-on-surface">
                            Constituents
                          </h3>
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-[9px] font-black text-outline uppercase tracking-widest">
                              {isVerified ? 'Balanced' : 'Unbalanced'}
                            </span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsParsed(false);
                            setUploadError(null);
                            setTimeout(() => {
                              if (fileInputRef.current) {
                                fileInputRef.current.click();
                              }
                            }, 100);
                          }}
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer relative z-40 p-3 -m-3 bg-white/5 rounded-lg border border-transparent hover:border-primary/20 transition-all"
                        >
                          <UploadCloud size={12} />
                          Upload New
                        </button>
                      </div>

                      {/* Composition Bar */}
                      <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden flex shadow-inner border border-white/20">
                        {metals
                          .filter(m => (m.baseline ?? 0) > 0 || parseFloat(m.value) > 0)
                          .map((metal) => (
                            <motion.div
                              key={`bar-${metal.id}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${metal.value}%` }}
                              style={{ 
                                 backgroundColor: metal.id === 'gold' ? '#EAB308' : 
                                                  metal.id === 'silver' ? '#94A3B8' : 
                                                  metal.id === 'copper' ? '#EA580C' : 
                                                  '#64748B' 
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50"></div>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                        {metals
                          .filter(m => (m.baseline ?? 0) > 0 || parseFloat(m.value) > 0)
                          .map((metal) => (
                          <motion.div
                            layout
                            key={metal.id}
                            className={`flex flex-col p-5 rounded-2xl border-2 transition-all relative overflow-hidden group/card ${
                              lastEditedId === metal.id 
                                ? "border-primary/60 ring-4 ring-primary/5 scale-[1.02] shadow-lg" 
                                : "border-outline-variant/40 hover:border-primary/40 shadow-sm hover:shadow-md"
                            }`}
                            style={{
                              background: `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, ${metal.color.replace('bg-', 'rgba(var(--color-').replace('-50', '-rgb),0.05)')} 100%)`,
                              backdropFilter: 'blur(20px)',
                            }}
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white/10 -mr-12 -mt-12 rounded-full blur-xl group-hover/card:scale-110 transition-transform duration-700"></div>
                            
                            <div className="flex items-center gap-3 relative z-10 mb-3">
                              <div className={`w-10 h-10 rounded-lg ${metal.color} flex items-center justify-center ${metal.textColor} font-mono font-black text-sm border border-white/20 group-hover:rotate-2 transition-transform relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50"></div>
                                {metal.symbol.toUpperCase() === 'AU' ? <Coins size={16} className="absolute opacity-10 -right-1 -bottom-1 rotate-12" /> : 
                                 metal.symbol.toUpperCase() === 'AG' ? <Coins size={16} className="absolute opacity-10 -right-1 -bottom-1 rotate-12" /> :
                                 metal.symbol.toUpperCase() === 'CU' ? <Zap size={16} className="absolute opacity-10 -right-1 -bottom-1 rotate-12" /> :
                                 <Gem size={16} className="absolute opacity-10 -right-1 -bottom-1 rotate-12" />}
                                <span className="relative z-10">{metal.symbol}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[9px] font-black text-outline uppercase tracking-wider truncate block">
                                    {metal.name}
                                  </label>
                                  {metal.locked && <Lock size={7} className="text-secondary" />}
                                </div>
                                <div className="relative flex items-center group/input">
                                  <input
                                    className="w-full bg-transparent border-0 focus:ring-0 font-mono text-xl font-black text-on-surface p-0 tracking-tighter"
                                    type="text"
                                    value={tempValues[metal.id] ?? metal.value}
                                    onChange={(e) =>
                                      handleValueChange(metal.id, e.target.value)
                                    }
                                    disabled={metal.locked}
                                  />
                                  <span className="text-outline-variant font-mono font-black text-sm opacity-40">%</span>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleLock(metal.id)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  metal.locked 
                                    ? "bg-secondary-container/30 text-secondary" 
                                    : "text-outline-variant hover:text-primary hover:bg-primary-container/20"
                                }`}
                              >
                                {metal.locked ? (
                                  <Lock size={14} fill="currentColor" />
                                ) : (
                                  <LockOpen size={14} />
                                )}
                              </button>
                            </div>

                            {metal.history && metal.history.length > 0 && (
                              <div className="mt-auto pt-4 border-t border-black/5">
                                <div className="text-[10px] font-mono space-y-1">
                                  {metal.history.map((h, idx) => (
                                    <div key={idx} className="flex flex-wrap items-center gap-x-2 leading-tight">
                                      <span className="text-slate-500">
                                        {h.from.toFixed(3)} → {h.to.toFixed(3)}
                                      </span>

                                      <span
                                        className={`font-bold ${
                                          h.delta > 0 ? "text-green-600" : "text-red-600"
                                        }`}
                                      >
                                        ({h.delta > 0 ? "+" : ""}{h.delta.toFixed(3)}, {h.percent > 0 ? "+" : ""}{h.percent.toFixed(2)}%)
                                      </span>

                                      <span className="text-blue-500 font-bold">
                                        via {h.source}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
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
  </div>
  );
}
