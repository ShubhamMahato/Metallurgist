import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  getFileHandle,
  saveFileHandle,
  verifyPermission,
  readFileContent,
  clearFileHandle,
} from "../lib/fileSystem";
import { MetalValue } from "../types/dashboard";
import { INITIAL_METALS, METAL_MAP, ALL_AVAILABLE_METALS } from "../constants/metals";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;",
}[character] || character));

const rtfToPlainText = (rtf: string) => rtf
  .replace(/\\par/g, "\n")
  .replace(/\\tab/g, " ")
  .replace(/\\'[0-9a-f]{2}/gi, "")
  .replace(/\\[a-z]+\d* ?/gi, "")
  .replace(/[{}]/g, "")
  .trim();

const generateFischerPrintPreview = ({
  sourceContent,
  customerName,
  weight,
  sampleType,
  karat,
  metals,
}: {
  sourceContent: string;
  customerName: string;
  weight: string;
  sampleType: string;
  karat: string;
  metals: MetalValue[];
}) => {
  const now = new Date();
  const timestamp = `${now.toLocaleDateString("en-GB").replace(/\//g, "-")}    ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`;
  const rows: string[][] = [
    ["silver", "copper", "zinc"], ["cadimium", "nickel", "palladium"],
    ["indium", "tin", "iredium"], ["ruthenium", "tungestan", "platinum"],
    ["lead", "cromium", "manganese"], ["rhodium", "iron", "cobalt"],
    ["gallium", "vanadium", "osmium"],
  ];
  const displayNames: Record<string, string> = {
    cadimium: "CADIMIUM", cromium: "CROMIUM", iredium: "IREDIUM", tungestan: "TUNGESTAN", vanadium: "VANADIUM",
  };
  const metalValue = (metalId: string) => {
    const metal = metals.find((item) => item.id === metalId);
    if (metal && ((metal.baseline ?? 0) > 0 || parseFloat(metal.value) > 0 || metal.isManual)) return parseFloat(metal.value).toFixed(3);
    return new RegExp(`${metalId.toUpperCase()}\\s+[-]{2,}`, "i").test(sourceContent) ? "--------" : "0.000";
  };

  let tableRows = "";
  for (const row of rows) {
    let cells = "";
    for (const id of row) cells += `<td class="label">${displayNames[id] || id.toUpperCase()}</td><td class="value">${metalValue(id)}</td>`;
    tableRows += `<tr>${cells}</tr>`;
  }
  const goldPurity = parseFloat(metals.find((metal) => metal.id === "gold")?.value || "0").toFixed(2);

  return `<!doctype html><html><head><title>Adjusted Fischer Report</title><style>
    @page { size: A4 portrait; margin: 18mm 14mm; } * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
    .report { width: 100%; max-width: 182mm; margin: 0 auto; font-size: 12pt; }
    .timestamp { text-align: right; min-height: 18px; margin-bottom: 18px; }
    .customer { margin-bottom: 22px; white-space: pre-wrap; }.metadata { display: flex; margin-bottom: 8px; }
    .metaInfo { margin-right: 50px; }
    .rule { border: 0; border-top: 1px dashed #777; margin: 7px 0; }.purity { display: grid; grid-template-columns: 1fr 1fr; padding: 4px 18px; font-size: 14pt; font-weight: 700; }.purity span:last-child { text-align: center; }
    table { width: 100%; border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 12pt; } td { border: 1px solid #aaa; height: 26px; padding: 3px 7px; } tbody tr:nth-child(even) td { background-color: #eeeeee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } td.label { width: 16.66%; } td.value { width: 16.66%; text-align: right; }
    @media print { body, table, tr, td { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .report { max-width: none; } }
  </style></head><body><main class="report"><div class="timestamp">${escapeHtml(timestamp)}</div><div class="customer">Customer Name     :${escapeHtml(customerName)}</div><div class="metadata"><span class="metaInfo">Weight</span><span class="metaInfo">:${escapeHtml(weight)}</span><span class="metaInfo">Sample Type</span><span>:${escapeHtml(sampleType)}</span></div><hr class="rule"><div class="purity"><span>Gold Purity : ${goldPurity}</span><span>Karat : ${escapeHtml(karat)}</span></div><hr class="rule"><table><tbody>${tableRows}</tbody></table></main></body></html>`;
};

export const useDashboard = () => {
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
  const [karatDisplay, setKaratDisplay] = useState<string>("18K");
  const [fileHandle, setFileHandle] = useState<any | null>(null);
  const [isPersistent, setIsPersistent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastModified, setLastModified] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showIntakeLink, setShowIntakeLink] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMetalRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const rebalanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setShowMobileMenu(false);
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

  const rtfToText = (rtf: string) => {
    return rtf
      .replace(/\\par/g, "\n")
      .replace(/\\tab/g, " ")
      .replace(/\\'[0-9a-f]{2}/gi, "")
      .replace(/\\[a-z]+\d* ?/gi, "")
      .replace(/[{}]/g, "")
      .trim();
  };

  const getKaratInfo = useCallback((purity: number) => {
    const exact = (purity * 24) / 100;
    const standards = [24, 23, 22, 21, 18, 14, 10, 9];

    let closest = standards[0];
    let minDiff = Math.abs(exact - closest);

    for (let k of standards) {
      const diff = Math.abs(exact - k);
      if (diff < minDiff) {
        minDiff = diff;
        closest = k;
      }
    }

    return {
      purity,
      karat_exact: Number(exact.toFixed(2)),
      karat_display: `${closest}K`
    };
  }, []);

  const calculateKarat = (goldPercent: number) => {
    const info = getKaratInfo(goldPercent);
    return info.karat_exact.toFixed(2);
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

    const editedMetal = parsedMetals.find((m) => m.id === editedId);
    const sourceName = editedMetal ? editedMetal.name : "Removal";

    const isAdjustable = (m: any) =>
      !m.locked &&
      m.id !== editedId &&
      ((m.baseline ?? 0) > 0 || m.numValue > 0 || m.isManual);

    let delta = 100 - parsedMetals.reduce((acc, m) => acc + m.numValue, 0);

    let attempts = 0;
    while (Math.abs(delta) > 0.0001 && attempts < 15) {
      attempts++;
      const adjustable = parsedMetals.filter((m) => {
        if (!isAdjustable(m)) return false;
        if (delta < 0 && m.numValue <= 0.0001) return false;
        if (delta > 0 && m.numValue >= 99.9999) return false;
        return true;
      });

      if (adjustable.length === 0) break;

      const weights = adjustable.map((m) => {
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

        if (newValue < 0) newValue = 0;
        if (newValue > 100) newValue = 100;

        remainingDelta -= (newValue - m.numValue);
        return { ...m, numValue: newValue };
      });

      delta = remainingDelta;
    }

    parsedMetals = parsedMetals.map(m => 
      m.id === editedId ? { ...m, numValue: newValueNum } : m
    );

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

  const balanceInitialMetals = (initialMetals: MetalValue[]) => {
    const originalMetals = initialMetals.map((m) => ({ ...m }));

    let parsedMetals = initialMetals.map((m) => ({
      ...m,
      numValue: parseFloat(m.value || "0"),
    }));

    let delta = 100 - parsedMetals.reduce((acc, m) => acc + m.numValue, 0);

    if (Math.abs(delta) < 0.0001) return initialMetals;

    const isAdjustable = (m: any) => !m.locked && m.numValue > 0;

    let attempts = 0;
    while (Math.abs(delta) > 0.0001 && attempts < 15) {
      attempts++;
      const adjustable = parsedMetals.filter((m) => {
        if (!isAdjustable(m)) return false;
        if (delta < 0 && m.numValue <= 0.0001) return false;
        if (delta > 0 && m.numValue >= 99.9999) return false;
        return true;
      });

      if (adjustable.length === 0) break;

      const weights = adjustable.map((m) =>
        Math.max(m.numValue, (m.baseline ?? 0) > 0 ? m.baseline! : 1.0),
      );
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      if (totalWeight === 0) break;

      let remainingDelta = delta;
      parsedMetals = parsedMetals.map((m) => {
        const adjIndex = adjustable.findIndex((a) => a.id === m.id);
        if (adjIndex === -1) return m;

        const share = (weights[adjIndex] / totalWeight) * delta;
        let newValue = m.numValue + share;
        if (newValue < 0) newValue = 0;
        if (newValue > 100) newValue = 100;

        remainingDelta -= newValue - m.numValue;
        return { ...m, numValue: newValue };
      });
      delta = remainingDelta;
    }

    return parsedMetals.map((m) => {
      const original = originalMetals.find((o) => o.id === m.id)!;
      const originalVal = parseFloat(original.value);
      const diff = m.numValue - originalVal;

      if (Math.abs(diff) > 0.0001) {
        const percent = originalVal === 0 ? 0 : (diff / originalVal) * 100;
        return {
          ...m,
          value: m.numValue.toFixed(3),
          previous: originalVal,
          delta: diff,
          percentChange: percent,
          changed: true,
          history: [
            {
              from: originalVal,
              to: m.numValue,
              delta: diff,
              percent: percent,
              source: "Auto-Balance",
            },
          ],
        };
      }

      return {
        ...m,
        value: m.numValue.toFixed(3),
        history: [],
      };
    });
  };

  const parseFileContent = (content: string) => {
    const cleanText = content.toUpperCase();

    const orderedMetals = [
      "GOLD", "SILVER", "COPPER", "ZINC", "CADIMIUM", "NICKEL", "PALLADIUM",
      "INDIUM", "TIN", "IREDIUM", "RUTHENIUM", "TUNGESTAN", "PLATINUM",
      "LEAD", "CROMIUM", "MANGANESE", "RHODIUM", "IRON", "COBALT",
      "GALLIUM", "VANADIUM", "OSMIUM",
    ];

    const newMetals: MetalValue[] = [];

    orderedMetals.forEach((metal) => {
      const regex = new RegExp(`${metal}\\s*(\\d+\\.\\d+|\\d+)`);
      const match = cleanText.match(regex);
      if (match) {
        const value = parseFloat(match[1]);
        if (isNaN(value)) return;

        let normalizedName = metal
          .replace("CADIMIUM", "Cadmium")
          .replace("CROMIUM", "Chromium")
          .replace("IREDIUM", "Iridium")
          .replace("TUNGESTAN", "Tungsten")
          .replace("VANADIUM", "Vanadium");

        if (!["Cadmium", "Chromium", "Iridium", "Tungsten", "Vanadium"].includes(normalizedName)) {
          normalizedName = metal.charAt(0) + metal.slice(1).toLowerCase();
        }

        const info = METAL_MAP[metal.toUpperCase()] || {
          name: normalizedName,
          color: "bg-slate-100",
          textColor: "text-slate-700",
        };

        const metalInfo = ALL_AVAILABLE_METALS.find((m) => m.id === metal.toLowerCase());

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
      const info = getKaratInfo(parseFloat(karatMatch[1]) * 100 / 24); // Reverse to get purity for display calculation
      setKaratDisplay(info.karat_display);
    }

    if (goldMatch) {
      const goldValue = parseFloat(goldMatch[1]);

      if (!karatMatch) {
        const calculated = calculateKarat(goldValue);
        setKarat(calculated);
        setBaselineKarat(calculated);
        setKaratDisplay(getKaratInfo(goldValue).karat_display);
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

      setMetals(balanceInitialMetals(rest));
    } else {
      if (!karatMatch) {
        const goldInLoop = newMetals.find((m) => m.id === "gold");
        if (goldInLoop) {
          const purity = parseFloat(goldInLoop.value);
          const calculated = calculateKarat(purity);
          setKarat(calculated);
          setBaselineKarat(calculated);
          setKaratDisplay(getKaratInfo(purity).karat_display);
        }
      }
      setMetals(balanceInitialMetals(newMetals));
    }

    if (newMetals.length > 0) {
      setIsParsed(true);
      setUploadError(null);
    } else {
      setUploadError("Could not extract valid metallurgical data.");
    }
  };

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
            setIsPersistent(false);
          }
        }
      } catch (err) {
        console.error("Error initializing file handle:", err);
      }
    };
    initFile();
  }, []);

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

    const gold = metals.find((m) => m.name.toLowerCase() === "gold");
    if (gold) {
      const goldValue = parseFloat(gold.value || "0");
      content = content.replace(
        /(GOLD\s+PURITY\s*:\s*)((?:\\\\[a-z0-9]+ ?|{[^{}]*}|\s)*?)(\d+\.?\d*)/i,
        `$1$2${goldValue.toFixed(2)}`,
      );

      const newKarat = calculateKarat(goldValue);
      content = content.replace(
        /(KARAT\s*:\s*)((?:\\\\[a-z0-9]+ ?|{[^{}]*}|\s)*?)(\d+\.?\d*)/i,
        `$1$2${newKarat}`,
      );
    }

    content = content.replace(
      /(CUSTOMER\s+NAME\s*:\s*)((?:\\\\[a-z0-9]+ ?|{[^{}]*}|\s)*?)([^\\\n\r{}]+)/i,
      `$1$2${customerName}`,
    );

    content = content.replace(
      /(WEIGHT\s*:\s*)((?:\\\\[a-z0-9]+ ?|{[^{}]*}|\s)*?)(\d+\.?\d*)/i,
      `$1$2${weight}`,
    );

    content = content.replace(
      /(SAMPLE\s+TYPE\s*:\s*)((?:\\\\[a-z0-9]+ ?|{[^{}]*}|\s)*?)([^\\\n\r{}]+)/i,
      `$1$2${sampleType}`,
    );

    return content;
  };

  const handlePrint = () => {
    const content = generateUpdatedContent();
    if (!content) {
      setUploadError("Upload a report before printing.");
      return;
    }

    // Opening the preview synchronously keeps it from being blocked as a pop-up.
    const printWindow = window.open("", "_blank", "popup");
    if (!printWindow) {
      setUploadError("Your browser blocked the print preview. Allow pop-ups and try again.");
      return;
    }

    printWindow.document.write("<title>Preparing print preview…</title><p style='font-family:system-ui;padding:2rem'>Preparing print preview…</p>");
    printWindow.document.close();

    try {
      const documentForPrint = printWindow.document;
      documentForPrint.open();
      documentForPrint.write(generateFischerPrintPreview({
        sourceContent: originalContent,
        customerName,
        weight,
        sampleType,
        karat: karatDisplay,
        metals,
      }));
      documentForPrint.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 100);
    } catch (error) {
      console.error("Print preview failed:", error);
      printWindow.close();
      setUploadError("Could not render this report for printing. Try uploading an RTF or text report.");
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
      
      const file = await fileHandle.getFile();
      setLastModified(file.lastModified);
      
      console.log("File saved successfully");
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

  const handleValueChange = (id: string, newValue: string) => {
    if (newValue !== "" && !/^\d*\.?\d*$/.test(newValue)) return;

    setLastEditedId(id);
    setTempValues((prev) => ({ ...prev, [id]: newValue }));

    if (rebalanceTimeoutRef.current) {
      clearTimeout(rebalanceTimeoutRef.current);
    }

    rebalanceTimeoutRef.current = setTimeout(() => {
      if (newValue === "" || newValue === "." || newValue.endsWith(".")) return;

      const numValue = parseFloat(newValue);
      const processedValue = numValue >= 100 ? "100.000" : newValue;

      setMetals((prev) => {
        if (id === "gold") {
          const purity = parseFloat(processedValue);
          setKarat(calculateKarat(purity));
          setKaratDisplay(getKaratInfo(purity).karat_display);
        }
        return rebalanceMetals(prev, id, processedValue);
      });
    }, 1000);
  };

  const handleValueBlur = (id: string) => {
    setTempValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLastEditedId(null);
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

      const isPurelyManual = metalToRemove.baseline === undefined;

      let nextMetals: MetalValue[];
      if (isPurelyManual) {
        nextMetals = prev.filter((m) => m.id !== id);
      } else {
        nextMetals = prev.map((m) =>
          m.id === id ? { ...m, value: "0.000", isManual: false } : m,
        );
      }

      return rebalanceMetals(nextMetals, id, "0.000");
    });
  };

  const resetToOriginal = () => {
    setMetals((prev) => {
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
    setKaratDisplay(getKaratInfo(parseFloat(baselineKarat) * 100 / 24).karat_display);
    setTempValues({});
    setLastEditedId(null);
  };

  const downloadDOC = () => {
    const content = generateUpdatedContent();
    const blob = new Blob([content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "updated_report.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".doc")) {
      setUploadError("Please upload a .txt or .doc file.");
      return;
    }

    setIsPersistent(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setOriginalContent(content);
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

    const info = METAL_MAP[metalId.toUpperCase()] || {
      name: metalInfo.name,
      color: "bg-slate-100",
      textColor: "text-slate-700",
    };

    setMetals((prev) => {
      const existing = prev.find((m) => m.id === metalId);
      if (existing) {
        return prev.map((m) =>
          m.id === metalId ? { ...m, isManual: true } : m
        );
      }
      return [
        ...prev,
        {
          id: metalId,
          name: info.name,
          symbol: metalInfo.symbol,
          value: "0.000",
          locked: false,
          color: info.color,
          textColor: info.textColor,
          isManual: true,
          history: [],
        },
      ];
    });
    setIsAddingMetal(false);
  };

  return {
    lastEditedId,
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
    karatDisplay,
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
  };
};
