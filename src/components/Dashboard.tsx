import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Printer,
  UploadCloud,
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
  Plus,
  X,
  Settings,
  Save,
  LockOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  getFileHandle, 
  saveFileHandle, 
  verifyPermission, 
  readFileContent,
  clearFileHandle
} from "../lib/fileSystem";
import { reportTemplate } from "../lib/reportTemplate";
import { Printer as PrinterIcon } from "lucide-react";

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
  isManual?: boolean;
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
    id: "gold",
    name: "Gold",
    symbol: "Au",
    value: "75.240",
    locked: true,
    color: "bg-yellow-50",
    textColor: "text-yellow-600",
    baseline: 75.24,
  },
  {
    id: "silver",
    name: "Silver",
    symbol: "Ag",
    value: "15.100",
    locked: false,
    color: "bg-slate-100",
    textColor: "text-slate-600",
    baseline: 15.1,
  },
  {
    id: "copper",
    name: "Copper",
    symbol: "Cu",
    value: "9.420",
    locked: false,
    color: "bg-orange-50",
    textColor: "text-orange-700",
    baseline: 9.42,
  },
  {
    id: "zinc",
    name: "Zinc",
    symbol: "Zn",
    value: "0.240",
    locked: false,
    color: "bg-teal-50",
    textColor: "text-teal-700",
    baseline: 0.24,
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
  NICKEL: { name: "Nickel", color: "bg-blue-50", textColor: "text-blue-700" },
  PALLADIUM: {
    name: "Palladium",
    color: "bg-cyan-50",
    textColor: "text-cyan-700",
  },
  TIN: { name: "Tin", color: "bg-stone-50", textColor: "text-stone-700" },
  LEAD: { name: "Lead", color: "bg-neutral-50", textColor: "text-neutral-700" },
  CADIMIUM: {
    name: "Cadimium",
    color: "bg-rose-50",
    textColor: "text-rose-700",
  },
  CROMIUM: {
    name: "Cromium",
    color: "bg-emerald-50",
    textColor: "text-emerald-700",
  },
  MANGANESE: {
    name: "Manganese",
    color: "bg-fuchsia-50",
    textColor: "text-fuchsia-700",
  },
  RHODIUM: { name: "Rhodium", color: "bg-sky-50", textColor: "text-sky-700" },
  COBALT: { name: "Cobalt", color: "bg-blue-50", textColor: "text-blue-800" },
  INDIUM: {
    name: "Indium",
    color: "bg-violet-50",
    textColor: "text-violet-700",
  },
  IREDIUM: {
    name: "Iredium",
    color: "bg-purple-50",
    textColor: "text-purple-700",
  },
  RUTHENIUM: {
    name: "Ruthenium",
    color: "bg-pink-50",
    textColor: "text-pink-700",
  },
  TUNGESTAN: {
    name: "Tungestan",
    color: "bg-zinc-50",
    textColor: "text-zinc-700",
  },
  GALLIUM: {
    name: "Gallium",
    color: "bg-amber-50",
    textColor: "text-amber-700",
  },
  VANADIUM: {
    name: "Vanadium",
    color: "bg-slate-50",
    textColor: "text-slate-800",
  },
  OSMIUM: {
    name: "Osmium",
    color: "bg-indigo-50",
    textColor: "text-indigo-900",
  },
};

const ALL_AVAILABLE_METALS = [
  { id: "gold", symbol: "Au", name: "Gold" },
  { id: "silver", symbol: "Ag", name: "Silver" },
  { id: "copper", symbol: "Cu", name: "Copper" },
  { id: "zinc", symbol: "Zn", name: "Zinc" },
  { id: "cadimium", symbol: "Cd", name: "Cadimium" },
  { id: "nickel", symbol: "Ni", name: "Nickel" },
  { id: "palladium", symbol: "Pd", name: "Palladium" },
  { id: "indium", symbol: "In", name: "Indium" },
  { id: "tin", symbol: "Sn", name: "Tin" },
  { id: "iredium", symbol: "Ir", name: "Iredium" },
  { id: "ruthenium", symbol: "Ru", name: "Ruthenium" },
  { id: "tungestan", symbol: "W", name: "Tungestan" },
  { id: "platinum", symbol: "Pt", name: "Platinum" },
  { id: "lead", symbol: "Pb", name: "Lead" },
  { id: "cromium", symbol: "Cr", name: "Cromium" },
  { id: "manganese", symbol: "Mn", name: "Manganese" },
  { id: "rhodium", symbol: "Rh", name: "Rhodium" },
  { id: "iron", symbol: "Fe", name: "Iron" },
  { id: "cobalt", symbol: "Co", name: "Cobalt" },
  { id: "gallium", symbol: "Ga", name: "Gallium" },
  { id: "vanadium", symbol: "V", name: "Vanadium" },
  { id: "osmium", symbol: "Os", name: "Osmium" },
];

export default function Dashboard() {
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [metals, setMetals] = useState<MetalValue[]>(INITIAL_METALS);
  const [tempValues, setTempValues] = useState<Record<string, string>>({});
  const [isParsed, setIsParsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [karat, setKarat] = useState<string>("18.06");
  const [baselineKarat, setBaselineKarat] = useState<string>("18.06");
  const [customerName, setCustomerName] = useState<string>("JAJ");
  const [weight, setWeight] = useState<string>("1.510");
  const [sampleType, setSampleType] = useState<string>("RAWA");
  const [isAddingMetal, setIsAddingMetal] = useState(false);
  const [fileHandle, setFileHandle] = useState<any | null>(null);
  const [isPersistent, setIsPersistent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastModified, setLastModified] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMetalRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addMetalRef.current &&
        !addMetalRef.current.contains(event.target as Node)
      ) {
        setIsAddingMetal(false);
      }
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasChanges = metals.some((m) => (m.history && m.history.length > 0) || m.isManual);
      if (hasChanges) {
        const message =
          "The changes you made will be lost and you will switch to persisted file data.";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [metals]);
  const [originalContent, setOriginalContent] = useState("");
  const rebalanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initFile = async () => {
      try {
        const handle = await getFileHandle();
        if (handle) {
          setFileHandle(handle);
          const status = await handle.queryPermission({ mode: 'readwrite' });
          
          if (status === 'granted') {
            await loadFileFromHandle(handle);
            setIsPersistent(true);
          } else {
            // Permission is 'prompt' or 'denied'
            // We don't auto-load, but we keep the handle reference
            setIsPersistent(false);
          }
        }
      } catch (err) {
        console.error("Error initializing file handle:", err);
      }
    };
    initFile();
  }, []);

  const loadFileFromHandle = async (handle: any) => {
    try {
      const content = await readFileContent(handle);
      const file = await handle.getFile();
      setLastModified(file.lastModified);
      setOriginalContent(content);
      const clean = content.includes("{\\rtf") ? rtfToText(content) : content;
      parseFileContent(clean);
      setUploadError(null);
    } catch (err) {
      console.error("Failed to read file:", err);
      setUploadError("File not accessible, please reselect.");
      setIsPersistent(false);
    }
  };

  const requestFilePermission = async () => {
    if (!fileHandle) return;
    try {
      const hasPermission = await verifyPermission(fileHandle, true);
      if (hasPermission) {
        await loadFileFromHandle(fileHandle);
        setIsPersistent(true);
      }
    } catch (err) {
      console.error("Permission request failed:", err);
      setUploadError("Permission denied. Please select file manually.");
    }
  };

  // Polling for changes
  useEffect(() => {
    if (!fileHandle || !isParsed) return;

    const interval = setInterval(async () => {
      try {
        const file = await fileHandle.getFile();
        if (lastModified && file.lastModified > lastModified) {
          console.log("File changed on disk, reloading...");
          const content = await file.text();
          setLastModified(file.lastModified);
          setOriginalContent(content);
          const clean = content.includes("{\\rtf") ? rtfToText(content) : content;
          parseFileContent(clean);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fileHandle, lastModified, isParsed]);

  const connectFile = async () => {
    setIsConnecting(true);
    setUploadError(null);
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Laboratory Reports',
            accept: {
              'text/plain': ['.txt'],
              'application/msword': ['.doc'],
            },
          },
        ],
        multiple: false,
      });

      if (handle) {
        await saveFileHandle(handle);
        setFileHandle(handle);
        const hasPermission = await verifyPermission(handle, true);
        if (hasPermission) {
          const content = await readFileContent(handle);
          const file = await handle.getFile();
          setLastModified(file.lastModified);
          setOriginalContent(content);
          const clean = content.includes("{\\rtf") ? rtfToText(content) : content;
          parseFileContent(clean);
          setIsPersistent(true);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Connection error:", err);
        setUploadError("Failed to connect to file.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const generateTemplateHtml = () => {
    let html = reportTemplate;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const replacements: Record<string, string> = {
      '{{DATE}}': dateStr,
      '{{TIME}}': timeStr,
      '{{CUSTOMER_NAME}}': customerName,
      '{{WEIGHT}}': weight,
      '{{SAMPLE_TYPE}}': sampleType,
      '{{GOLD_PURITY}}': parseFloat(metals.find(m => m.id === 'gold')?.value || '0').toFixed(2),
      '{{KARAT}}': karat,
    };

    // Add all metals to replacements
    metals.forEach(m => {
      const id = m.id.toUpperCase();
      replacements[`{{${id}}}`] = parseFloat(m.value).toFixed(3);
      
      // Handle specific mappings for template placeholders
      if (id === 'CADIMIUM') replacements['{{CADMIUM}}'] = parseFloat(m.value).toFixed(3);
      if (id === 'TUNGESTAN') replacements['{{TUNGESTAN}}'] = parseFloat(m.value).toFixed(3);
      if (id === 'IREDIUM') replacements['{{IREDIUM}}'] = parseFloat(m.value).toFixed(3);
      if (id === 'CROMIUM') replacements['{{CROMIUM}}'] = parseFloat(m.value).toFixed(3);
    });

    // Ensure all placeholders in template are replaced (even if not in metals)
    const placeholders = html.match(/{{[A-Z_]+}}/g) || [];
    placeholders.forEach(p => {
      if (!replacements[p]) {
        replacements[p] = '0.000';
      }
    });

    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replace(new RegExp(key, 'g'), value);
    });

    return html;
  };

  const handlePrint = () => {
    const html = generateTemplateHtml();
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      
      // Wait for resources to load if any (though here it's mostly inline)
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  const saveToOriginalFile = async () => {
    if (!fileHandle || !isPersistent) return;
    
    setIsSaving(true);
    try {
      const content = generateUpdatedContent();
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      // Update last modified to avoid self-triggering polling reload
      const file = await fileHandle.getFile();
      setLastModified(file.lastModified);
      
      console.log("File saved successfully");
      
      // Also trigger print using template as requested
      handlePrint();
    } catch (err) {
      console.error("Save error:", err);
      setUploadError("Failed to save to original file. Falling back to download.");
      downloadDOC();
    } finally {
      setIsSaving(false);
    }
  };

  const reloadFile = async () => {
    if (!fileHandle) return;
    
    try {
      const hasPermission = await verifyPermission(fileHandle);
      if (!hasPermission) return;

      const content = await readFileContent(fileHandle);
      const file = await fileHandle.getFile();
      setLastModified(file.lastModified);
      setOriginalContent(content);
      const clean = content.includes("{\\rtf") ? rtfToText(content) : content;
      parseFileContent(clean);
      setUploadError(null);
    } catch (err) {
      console.error("Reload error:", err);
      setUploadError("Failed to reload file.");
    }
  };

  const disconnectFile = async () => {
    await clearFileHandle();
    setFileHandle(null);
    setIsPersistent(false);
    setLastModified(null);
    setIsParsed(false);
    setOriginalContent("");
    setMetals(INITIAL_METALS);
    setShowSettings(false);
  };

  const calculateKarat = (goldPercent: number) => {
    return ((goldPercent * 24) / 100).toFixed(2);
  };

  const generateUpdatedContent = () => {
    if (!originalContent) return "";

    let content = originalContent;

    metals.forEach((m) => {
      const name = m.id.toUpperCase();
      const value = parseFloat(m.value || "0").toFixed(3);

      const regex = new RegExp(
        `(${name})(?:\\s|\\\\[a-z0-9]+ ?|{[^{}]*})*?(\\d+\\.?\\d*)`,
        "gi",
      );

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
    setTempValues((prev) => ({ ...prev, [id]: newValue }));

    // Debounce the global state update and rebalancing
    if (rebalanceTimeoutRef.current) {
      clearTimeout(rebalanceTimeoutRef.current);
    }

    rebalanceTimeoutRef.current = setTimeout(() => {
      if (newValue === "" || newValue === "." || newValue.endsWith(".")) return;

      const numValue = parseFloat(newValue);
      const processedValue = numValue >= 100 ? "100.000" : newValue;

      setMetals((prev) => {
        if (id === "gold") {
          setKarat(calculateKarat(parseFloat(processedValue)));
        }
        return rebalanceMetals(prev, id, processedValue);
      });

      // Clear the temporary value after the state update is queued
      setTempValues((prev) => {
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

  const removeMetal = (id: string) => {
    setMetals((prev) => {
      const metalToRemove = prev.find((m) => m.id === id);
      if (!metalToRemove) return prev;

      // If it's a baseline metal, we just set it to 0 instead of removing it from the array
      // If it's purely manual (baseline undefined), we can remove it from the array
      const isPurelyManual = metalToRemove.baseline === undefined;

      let nextMetals: MetalValue[];
      if (isPurelyManual) {
        nextMetals = prev.filter((m) => m.id !== id);
      } else {
        nextMetals = prev.map((m) =>
          m.id === id ? { ...m, value: "0.000", isManual: false } : m,
        );
      }

      // Rebalance the remaining metals to absorb the removed value
      return rebalanceMetals(nextMetals, id, "0.000");
    });
  };

  const resetToOriginal = () => {
    setMetals((prev) => {
      // Filter out purely manual metals that weren't in the original report
      // Original metals have a defined baseline
      const originalMetals = prev.filter((m) => m.baseline !== undefined);

      return originalMetals.map((m) => {
        const base = m.baseline ?? 0;

        return {
          ...m,
          value: base.toFixed(3),
          locked: m.id === "gold" ? true : false,
          isManual: false,
          history: [],
        };
      });
    });

    setKarat(baselineKarat);
    setTempValues({});
    setLastEditedId(null);
  };

  const rebalanceMetals = (
    prevMetals: MetalValue[],
    editedId: string,
    newValueStr: string,
  ) => {
    const newValueNum = parseFloat(newValueStr);

    let parsedMetals = prevMetals.map((m) => ({
      ...m,
      numValue: m.id === editedId ? newValueNum : parseFloat(m.value || "0"),
    }));

    // If we're removing a metal, it might not be in parsedMetals anymore
    const editedMetal = parsedMetals.find((m) => m.id === editedId);
    const sourceName = editedMetal ? editedMetal.name : "Removal";

    // Requirement: Only adjust metals that are "active" (visible) and not locked/edited
    // Active means: positive baseline, positive current value, or manually added.
    const isAdjustable = (m: any) =>
      !m.locked &&
      m.id !== editedId &&
      ((m.baseline ?? 0) > 0 || m.numValue > 0 || m.isManual);

    let delta = 100 - parsedMetals.reduce((acc, m) => acc + m.numValue, 0);

    // Iterative distribution to handle clamping and ensure aggregate is exactly 100
    let attempts = 0;
    while (Math.abs(delta) > 0.0001 && attempts < 15) {
      attempts++;
      const adjustable = parsedMetals.filter((m) => {
        if (!isAdjustable(m)) return false;
        if (delta < 0 && m.numValue <= 0.0001) return false; // Can't decrease further
        if (delta > 0 && m.numValue >= 99.9999) return false; // Can't increase further
        return true;
      });

      if (adjustable.length === 0) break;

      // Weights calculation
      const weights = adjustable.map((m) => {
        // If it's a manual metal with 0 value, give it a boost to ensure it picks up the delta
        if (m.isManual && m.numValue < 0.001) return 10.0;
        return Math.max(m.numValue, (m.baseline ?? 0) > 0 ? m.baseline! : 1.0);
      });
      
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      if (totalWeight === 0) break;

      let remainingDelta = delta;
      parsedMetals = parsedMetals.map((m) => {
        const adjIndex = adjustable.findIndex((a) => a.id === m.id);
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

    // Final safety check: ensure the edited metal is EXACTLY what the user typed
    // and hasn't been accidentally modified by any logic
    parsedMetals = parsedMetals.map(m => 
      m.id === editedId ? { ...m, numValue: newValueNum } : m
    );

    // Final pass to update strings and history
    return parsedMetals.map((m) => {
      const prev = prevMetals.find((x) => x.id === m.id)!;
      const prevValue = parseFloat(prev.value || "0");
      const adjustment = m.numValue - prevValue;
      const percentChange =
        prevValue === 0 ? 0 : (adjustment / prevValue) * 100;

      const lastHistory =
        m.history && m.history.length > 0
          ? m.history[m.history.length - 1]
          : null;
      let newHistory = m.history || [];

      if (Math.abs(adjustment) > 0.0001) {
        // Source is either the user (for the edited metal) or the edited metal (for rebalanced ones)
        const historySource = m.id === editedId ? "User Edit" : sourceName;

        if (lastHistory && lastHistory.source === historySource) {
          const totalDelta = m.numValue - lastHistory.from;
          const totalPercent =
            lastHistory.from === 0 ? 0 : (totalDelta / lastHistory.from) * 100;
          const updatedEntry = {
            ...lastHistory,
            to: m.numValue,
            delta: totalDelta,
            percent: totalPercent,
          };
          newHistory = [...newHistory.slice(0, -1), updatedEntry];
        } else {
          newHistory = [
            ...newHistory,
            {
              from: prevValue,
              to: m.numValue,
              delta: adjustment,
              percent: percentChange,
              source: historySource,
            },
          ];
        }
      }

      return {
        ...m,
        value: m.numValue.toFixed(3),
        previous: prevValue,
        delta: adjustment,
        percentChange,
        history: newHistory,
        lastAdjustedBy: m.id === editedId ? "User" : sourceName,
        changed: Math.abs(adjustment) > 0.0001,
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

        const info = METAL_MAP[metal.toUpperCase()] || {
          name: normalizedName,
          color: "bg-slate-100",
          textColor: "text-slate-700",
        };

        const metalInfo = ALL_AVAILABLE_METALS.find(
          (m) => m.id === metal.toLowerCase(),
        );

        newMetals.push({
          id: metal.toLowerCase(),
          name: info.name,
          symbol: metalInfo?.symbol || metal.slice(0, 2).toUpperCase(),
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
    const customerMatch = cleanText.match(/CUSTOMER\s+NAME\s*:\s*([^\n\r]+)/);
    const weightMatch = cleanText.match(/WEIGHT\s*:\s*(\d+\.\d+|\d+)/);
    const sampleTypeMatch = cleanText.match(/SAMPLE\s+TYPE\s*:\s*([^\n\r]+)/);

    if (customerMatch) setCustomerName(customerMatch[1].trim());
    if (weightMatch) setWeight(weightMatch[1].trim());
    if (sampleTypeMatch) setSampleType(sampleTypeMatch[1].trim());

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
      // If no GOLD PURITY match, check if we found gold in the loop for Karat calculation
      if (!karatMatch) {
        const goldInLoop = newMetals.find((m) => m.id === "gold");
        if (goldInLoop) {
          const calculated = calculateKarat(parseFloat(goldInLoop.value));
          setKarat(calculated);
          setBaselineKarat(calculated);
        }
      }
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

    setIsPersistent(false); // One-time upload mode
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


  const addMetal = (metalId: string) => {
    const metalInfo = ALL_AVAILABLE_METALS.find((m) => m.id === metalId);
    if (!metalInfo) return;

    const existing = metals.find((m) => m.id === metalId);

    // 👉 If already exists (but hidden because 0), just activate it
    if (existing) {
      setMetals((prev) =>
        prev.map((m) => (m.id === metalId ? { ...m, isManual: true } : m)),
      );

      setIsAddingMetal(false);
      return;
    }

    // 👉 If completely new metal
    const info = METAL_MAP[metalId.toUpperCase()] || {
      name: metalInfo.name,
      color: "bg-slate-100",
      textColor: "text-slate-700",
    };

    const newMetal: MetalValue = {
      id: metalId,
      name: metalInfo.name,
      symbol: metalInfo.symbol,
      value: "0.000",
      locked: metalId === "gold",
      isManual: true,
      color: info.color,
      textColor: info.textColor,
      baseline: undefined, // 🔥 Manual metals have no baseline
      history: [],
    };

    setMetals((prev) => [...prev, newMetal]);
    setIsAddingMetal(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-x-hidden overflow-y-hidden bg-background text-on-background font-body">
      {/* Main UI */}
      <div className="flex flex-col h-full">
        {/* TopNavBar */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-2 sm:px-6 py-3 w-full bg-surface-container-lowest border-b border-outline-variant/30">
          <div className="flex items-center gap-1.5 sm:gap-8 min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tighter text-on-surface font-headline flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary shrink-0">
                <Sparkles size={16} />
              </div>
              <span className="truncate font-black">Metallurgist Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={saveToOriginalFile}
                  disabled={!isParsed || isSaving}
                  className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    isParsed && !isSaving
                      ? "bg-primary text-on-primary hover:opacity-90 cursor-pointer"
                      : "bg-surface-container text-outline-variant cursor-not-allowed opacity-60"
                  }`}
                >
                  <Save size={14} className={`shrink-0 ${isSaving ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save to Original File'}</span>
                  <span className="sm:hidden">{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                
                <button
                  onClick={handlePrint}
                  disabled={!isParsed}
                  className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    isParsed
                      ? "bg-primary text-on-primary hover:opacity-90 cursor-pointer"
                      : "bg-surface-container text-outline-variant cursor-not-allowed opacity-60"
                  }`}
                >
                  <PrinterIcon size={14} className="shrink-0" />
                  <span className="hidden sm:inline">Print Report</span>
                  <span className="sm:hidden">Print</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadDOC}
                  disabled={!isParsed}
                  className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    isParsed
                      ? "bg-primary text-on-primary hover:opacity-90 cursor-pointer"
                      : "bg-surface-container text-outline-variant cursor-not-allowed opacity-60"
                  }`}
                >
                  <FileText size={14} className="shrink-0" />
                  <span className="hidden sm:inline">Download File</span>
                  <span className="sm:hidden">Download</span>
                </button>

                <button
                  onClick={handlePrint}
                  disabled={!isParsed}
                  className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    isParsed
                      ? "bg-secondary text-on-secondary hover:opacity-90 cursor-pointer"
                      : "bg-surface-container text-outline-variant cursor-not-allowed opacity-60"
                  }`}
                >
                  <PrinterIcon size={14} className="shrink-0" />
                  <span className="hidden sm:inline">Print Report</span>
                  <span className="sm:hidden">Print</span>
                </button>
              </div>
            )}

            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-outline-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-all"
                title="Settings"
              >
                <Settings size={18} />
              </button>
              
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 top-20 sm:top-full mt-2 w-[calc(100%-2rem)] sm:w-64 max-w-sm bg-surface-container-highest rounded-2xl shadow-2xl border border-outline-variant/30 p-2 z-[100]"
                  >
                    <div className="px-3 py-2 border-b border-outline-variant/30 mb-1">
                      <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                        File Settings
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
                        <span className="text-[9px] font-medium text-outline-variant">Select a different report</span>
                      </div>
                    </button>
                    <button
                      onClick={disconnectFile}
                      className="w-full text-left px-3 py-2.5 hover:bg-error/10 rounded-xl transition-colors flex items-center gap-3 text-xs font-bold text-error"
                    >
                      <X size={16} />
                      <div className="flex flex-col">
                        <span>Disconnect File</span>
                        <span className="text-[9px] font-medium text-error/60">Stop persistent sync</span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <main className="w-full h-full overflow-hidden bg-surface">
            {/* Main Column: Editor */}
            <div className="w-full h-full flex flex-col p-3 sm:p-8 overflow-y-auto custom-scrollbar relative bg-surface">
              {/* Background Pattern & Gradients */}
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
                      e.target.value = "";
                    }
                  }}
                />
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest">
                      <Activity size={10} className="animate-pulse" />
                      {fileHandle ? "Live File Connection Active" : "Live Analysis System"}
                    </div>
                    <h2 className="text-3xl font-black tracking-tight font-headline text-on-surface leading-tight">
                      {fileHandle ? (
                        <>Connected <span className="text-primary">Report</span></>
                      ) : (
                        <>Report <span className="text-primary">Composition</span></>
                      )}
                    </h2>
                    {fileHandle && (
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-outline-variant font-mono flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isPersistent ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                          {isPersistent ? 'Connected:' : 'Access Required:'} {fileHandle.name}
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

                  <div
                    className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto"
                    style={{
                      opacity: isParsed ? 1 : 0,
                      transform: isParsed ? "none" : "translateY(10px)",
                      transition: "all 0.5s ease",
                      pointerEvents: isParsed ? "auto" : "none",
                    }}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-3 bg-white/40 backdrop-blur-xl px-2 sm:px-4 py-2 rounded-2xl border border-white/40 shadow-sm">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
                        <ShieldCheck size={14} className="sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[7px] sm:text-[8px] font-black text-outline uppercase tracking-widest leading-none mb-1">
                          Aggregate
                        </p>
                        <div className="flex items-baseline gap-0.5">
                          <motion.span
                            key={totalAggregate}
                            className={`text-lg sm:text-xl font-black font-headline ${isVerified ? "text-green-600" : "text-red-600"}`}
                          >
                            {totalAggregate}
                          </motion.span>
                          <span className="text-[7px] sm:text-[8px] font-bold text-outline">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <div 
                      title={`Current Karat value: ${karat}K`}
                      className="flex items-center gap-1.5 sm:gap-3 bg-white/40 backdrop-blur-xl px-2 sm:px-4 py-2 rounded-2xl border border-white/40 shadow-sm"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Gem size={14} className="sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[7px] sm:text-[8px] font-black text-outline uppercase tracking-widest leading-none mb-1">
                          Karat
                        </p>
                        <div className="flex items-baseline gap-0.5">
                          <motion.span
                            key={karat}
                            className="text-lg sm:text-xl font-black font-headline text-primary"
                          >
                            {karat}
                          </motion.span>
                          <span className="text-[7px] sm:text-[8px] font-black text-outline uppercase tracking-widest ml-0.5">
                            K
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={resetToOriginal}
                      title="Reset all constituents to original laboratory report values"
                      className="flex items-center gap-1.5 sm:gap-3 bg-white/40 backdrop-blur-xl px-2 sm:px-4 py-2 rounded-2xl border border-white/40 shadow-sm hover:bg-primary-fixed transition-all group cursor-pointer col-span-2 sm:flex-none justify-center sm:justify-start"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-outline-variant/20 flex items-center justify-center text-outline group-hover:text-primary transition-colors shrink-0">
                        <History
                          size={14}
                          className="sm:w-4 sm:h-4 group-hover:rotate-[-45deg] transition-transform"
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-black font-headline text-on-surface group-hover:text-primary transition-colors">
                        Reset
                      </span>
                    </button>
                  </div>
                </header>

                {/* Upload Area - Only show if NOT parsed or if user wants to upload new */}
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
                          <Zap
                            className="text-primary"
                            size={24}
                          />
                        </div>
                        <p className="text-sm font-bold text-primary">
                          {isConnecting ? "Connecting..." : "Persistent Connection"}
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

                {/* Editor Section */}
                <AnimatePresence>
                  {isParsed && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="space-y-4 relative z-30"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-4 relative z-40">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black font-headline text-on-surface">
                              Constituents
                            </h3>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${isVerified ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                              ></div>
                              <span className="text-[9px] font-black text-outline uppercase tracking-widest">
                                {isVerified ? "Balanced" : "Unbalanced"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 relative z-50">
                            <div className="relative" ref={addMetalRef}>
                              <button
                                onClick={() => setIsAddingMetal(!isAddingMetal)}
                                title="Add a new metal constituent to the report"
                                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer p-3 -m-3 bg-white/5 rounded-lg border border-transparent hover:border-primary/20 transition-all"
                              >
                                <Plus size={12} />
                                Add Constituent
                              </button>

                              <AnimatePresence>
                                {isAddingMetal && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:top-full mt-4 w-[calc(100%-2rem)] sm:w-64 max-w-sm bg-white rounded-2xl shadow-2xl border border-black/5 p-2 z-[100] max-h-[80vh] sm:max-h-[400px] overflow-y-auto custom-scrollbar"
                                  >
                                    <div className="p-2 text-[10px] font-black text-outline uppercase tracking-widest border-b border-black/5 mb-1">
                                      Select Metal to Add
                                    </div>
                                    {ALL_AVAILABLE_METALS.filter((m) => {
                                      const existing = metals.find(
                                        (x) => x.id === m.id,
                                      );
                                      if (!existing) return true;
                                      
                                      // A metal is "on screen" if it has a baseline, a positive value, or is manual
                                      const isOnScreen = (existing.baseline ?? 0) > 0 || parseFloat(existing.value) > 0 || existing.isManual;
                                      return !isOnScreen;
                                    }).map((metal) => (
                                      <button
                                        key={metal.id}
                                        onClick={() => addMetal(metal.id)}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between group"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            {metal.symbol}
                                          </span>
                                          <span className="text-xs font-bold text-slate-700">
                                            {metal.name}
                                          </span>
                                        </div>
                                        <Plus
                                          size={12}
                                          className="text-slate-300 group-hover:text-primary transition-colors"
                                        />
                                      </button>
                                    ))}
                                    {ALL_AVAILABLE_METALS.filter((m) => {
                                      const existing = metals.find((x) => x.id === m.id);
                                      if (!existing) return true;
                                      const isOnScreen = (existing.baseline ?? 0) > 0 || parseFloat(existing.value) > 0 || existing.isManual;
                                      return !isOnScreen;
                                    }).length === 0 && (
                                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                                        All metals already added
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
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
                                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer p-3 -m-3 bg-white/5 rounded-lg border border-transparent hover:border-primary/20 transition-all"
                                >
                                  <UploadCloud size={12} />
                                  Upload New
                                </button>
                              </div>
                            </div>

                            {/* Composition Bar */}
                        <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden flex shadow-inner border border-white/20">
                          {metals
                            .filter(
                              (m) =>
                                (m.baseline ?? 0) > 0 ||
                                parseFloat(m.value) > 0 ||
                                m.isManual,
                            )
                            .map((metal) => (
                              <motion.div
                                key={`bar-${metal.id}`}
                                title={`${metal.name}: ${metal.value}%`}
                                initial={{ width: 0 }}
                                animate={{ width: `${metal.value}%` }}
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
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50"></div>
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
                              m.isManual,
                          )
                          .map((metal) => (
                            <motion.div
                              layout
                              key={metal.id}
                              title={`${metal.name} (${metal.symbol}): ${metal.value}%`}
                              className={`flex flex-col p-5 rounded-2xl border-2 transition-all relative group/card overflow-hidden ${
                                lastEditedId === metal.id
                                  ? "border-primary/60 ring-4 ring-primary/5 scale-[1.02] shadow-lg"
                                  : "border-outline-variant/40 hover:border-primary/40 shadow-sm hover:shadow-md"
                              }`}
                              style={{
                                background: `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, ${metal.color.replace("bg-", "rgba(var(--color-").replace("-50", "-rgb),0.05)")} 100%)`,
                                backdropFilter: "blur(20px)",
                              }}
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white/10 -mr-12 -mt-12 rounded-full blur-xl group-hover/card:scale-110 transition-transform duration-700"></div>

                              <div className="flex items-center gap-3 relative z-10 mb-3">
                                <div
                                  className={`w-10 h-10 rounded-lg ${metal.color} flex items-center justify-center ${metal.textColor} font-mono font-black text-sm border border-white/20 group-hover:rotate-2 transition-transform relative overflow-hidden`}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50"></div>
                                  {metal.symbol.toUpperCase() === "AU" ? (
                                    <Coins
                                      size={16}
                                      className="absolute opacity-10 -right-1 -bottom-1 rotate-12"
                                    />
                                  ) : metal.symbol.toUpperCase() === "AG" ? (
                                    <Coins
                                      size={16}
                                      className="absolute opacity-10 -right-1 -bottom-1 rotate-12"
                                    />
                                  ) : metal.symbol.toUpperCase() === "CU" ? (
                                    <Zap
                                      size={16}
                                      className="absolute opacity-10 -right-1 -bottom-1 rotate-12"
                                    />
                                  ) : (
                                    <Gem
                                      size={16}
                                      className="absolute opacity-10 -right-1 -bottom-1 rotate-12"
                                    />
                                  )}
                                  <span className="relative z-10">
                                    {metal.symbol}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <label className="text-[9px] font-black text-outline uppercase tracking-wider truncate block">
                                      {metal.name}
                                    </label>
                                    {metal.locked && (
                                      <Lock
                                        size={7}
                                        className="text-secondary"
                                      />
                                    )}
                                  </div>
                                  <div className="relative flex items-center group/input">
                                    <input
                                      className="w-full bg-transparent border-0 focus:ring-0 font-mono text-xl font-black text-on-surface p-0 tracking-tighter"
                                      type="text"
                                      title={`Edit concentration of ${metal.name}`}
                                      value={tempValues[metal.id] ?? metal.value}
                                      onChange={(e) =>
                                        handleValueChange(
                                          metal.id,
                                          e.target.value,
                                        )
                                      }
                                      disabled={metal.locked}
                                    />
                                    <span className="text-outline-variant font-mono font-black text-sm opacity-40">
                                      %
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleLock(metal.id)}
                                  title={metal.locked ? "Unlock to allow rebalancing" : "Lock to prevent changes during rebalancing"}
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
                                {metal.isManual && (
                                  <button
                                    onClick={() => removeMetal(metal.id)}
                                    className="p-1.5 rounded-lg text-outline-variant hover:text-red-500 hover:bg-red-50 transition-all"
                                    title="Remove constituent"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>

                              {metal.history && metal.history.length > 0 && (
                                <div className="mt-auto pt-4 border-t border-black/5">
                                  <div className="text-[10px] font-mono space-y-1">
                                    {metal.history.map((h, idx) => (
                                      <div
                                        key={idx}
                                        className="flex flex-wrap items-center gap-x-2 leading-tight"
                                      >
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
                                          {h.delta.toFixed(3)},{" "}
                                          {h.percent > 0 ? "+" : ""}
                                          {h.percent.toFixed(2)}%)
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
