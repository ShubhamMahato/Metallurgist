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
    if (metal && ((metal.baseline ?? 0) > 0 || parseFloat(metal.value) > 0 || metal.isManual)) return metal.value;
    return new RegExp(`${metalId.toUpperCase()}\\s+[-]{2,}`, "i").test(sourceContent) ? "--------" : "0.000";
  };

  let tableRows = "";
  for (const row of rows) {
    let cells = "";
    for (const id of row) cells += `<td class="label">${displayNames[id] || id.toUpperCase()}</td><td class="value">${metalValue(id)}</td>`;
    tableRows += `<tr>${cells}</tr>`;
  }
  const goldPurity = metals.find((metal) => metal.id === "gold")?.value || "0";

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
      karat_exact: exact.toFixed(2),
      karat_display: `${closest}K`,
    };
  }, []);

  const calculateKarat = (goldPercent: number): string => {
    const exact = (goldPercent * 24) / 100;
    return exact.toFixed(2);
  };

  const rebalanceMetals = (
    prevMetals: MetalValue[],
    editedId: string,
    newValueStr: string,
  ): MetalValue[] => {
    const rawNum = parseFloat(newValueStr);
    let newValueNum = isNaN(rawNum) ? 0 : rawNum;

    // Never let gold % go above 100
    if (editedId === "gold") {
      newValueNum = Math.min(100, Math.max(0, newValueNum));
    } else {
      newValueNum = Math.max(0, newValueNum);
    }

    // Working copies with numeric values and preserved locked flags
    let parsedMetals = prevMetals.map((m) => ({
      ...m,
      numValue: m.id === editedId ? newValueNum : parseFloat(m.value || "0"),
    }));

    const editedMetal = parsedMetals.find((m) => m.id === editedId);
    const sourceName = editedMetal ? editedMetal.name : "Adjustment";

    let delta = 100 - parsedMetals.reduce((acc, m) => acc + m.numValue, 0);

    // Only balance if there is a delta to distribute
    if (Math.abs(delta) > 0.00001) {
      if (editedId === "gold") {
        if (delta < 0) {
          // Gold was increased, so total sum > 100. We must reduce other metals by needToReduce.
          let needToReduce = Math.abs(delta);

          // 1. First metal is Silver: should get reduced and unlocked
          const silver = parsedMetals.find((m) => m.id === "silver");
          if (silver) {
            silver.locked = false; // unlock silver
            if (silver.numValue >= needToReduce) {
              silver.numValue -= needToReduce;
              needToReduce = 0;
            } else {
              needToReduce -= silver.numValue;
              silver.numValue = 0;
            }
          }

          // 2. If reduced value is more than the silver, then unlock copper and reduce from copper as well
          const copper = parsedMetals.find((m) => m.id === "copper");
          if (needToReduce > 0.00001 && copper) {
            copper.locked = false; // unlock copper
            if (copper.numValue >= needToReduce) {
              copper.numValue -= needToReduce;
              needToReduce = 0;
            } else {
              needToReduce -= copper.numValue;
              copper.numValue = 0;
            }
          }

          // 3. If more than silver + copper, then reduce from zinc
          const zinc = parsedMetals.find((m) => m.id === "zinc");
          if (needToReduce > 0.00001 && zinc) {
            zinc.locked = false; // unlock zinc
            if (zinc.numValue >= needToReduce) {
              zinc.numValue -= needToReduce;
              needToReduce = 0;
            } else {
              needToReduce -= zinc.numValue;
              zinc.numValue = 0;
            }
          }

          // 4. And then rest of the non-zero metals
          if (needToReduce > 0.00001) {
            for (const metal of parsedMetals) {
              if (
                metal.id !== "gold" &&
                metal.id !== "silver" &&
                metal.id !== "copper" &&
                metal.id !== "zinc" &&
                metal.numValue > 0.00001
              ) {
                metal.locked = false; // unlock metal
                if (metal.numValue >= needToReduce) {
                  metal.numValue -= needToReduce;
                  needToReduce = 0;
                  break;
                } else {
                  needToReduce -= metal.numValue;
                  metal.numValue = 0;
                }
              }
            }
          }
        } else {
          // Gold was decreased (delta > 0). Total sum < 100.
          // First replenish all other constituents as per original (baseline), then replenish silver.
          let surplus = delta;

          // 1. Replenish other non-zero metals that were depleted below baseline
          for (const metal of parsedMetals) {
            if (
              metal.id !== "gold" &&
              metal.id !== "silver" &&
              metal.id !== "copper" &&
              metal.id !== "zinc"
            ) {
              const base = metal.baseline !== undefined ? metal.baseline : metal.numValue;
              const deficit = Math.max(0, base - metal.numValue);
              if (deficit > 0.00001 && surplus > 0.00001) {
                const add = Math.min(surplus, deficit);
                metal.numValue += add;
                surplus -= add;
              }
            }
          }

          // 2. Replenish Zinc if below baseline
          const zinc = parsedMetals.find((m) => m.id === "zinc");
          if (zinc && surplus > 0.00001) {
            const base = zinc.baseline !== undefined ? zinc.baseline : zinc.numValue;
            const deficit = Math.max(0, base - zinc.numValue);
            if (deficit > 0.00001) {
              const add = Math.min(surplus, deficit);
              zinc.numValue += add;
              surplus -= add;
            }
          }

          // 3. Replenish Copper if below baseline
          const copper = parsedMetals.find((m) => m.id === "copper");
          if (copper && surplus > 0.00001) {
            const base = copper.baseline !== undefined ? copper.baseline : copper.numValue;
            const deficit = Math.max(0, base - copper.numValue);
            if (deficit > 0.00001) {
              const add = Math.min(surplus, deficit);
              copper.numValue += add;
              surplus -= add;
            }
          }

          // 4. And then update / replenish Silver with any remaining surplus
          const silver = parsedMetals.find((m) => m.id === "silver");
          if (silver && surplus > 0.00001) {
            silver.locked = false;
            silver.numValue += surplus;
            surplus = 0;
          } else if (surplus > 0.00001) {
            if (copper) {
              copper.locked = false;
              copper.numValue += surplus;
              surplus = 0;
            } else {
              const firstOther = parsedMetals.find((m) => m.id !== "gold");
              if (firstOther) {
                firstOther.locked = false;
                firstOther.numValue += surplus;
                surplus = 0;
              }
            }
          }
        }
      } else {
        // User edited a metal other than Gold
        if (delta < 0) {
          let needToReduce = Math.abs(delta);
          const reductionOrder = ["silver", "copper", "zinc"].filter((id) => id !== editedId);
          for (const redId of reductionOrder) {
            const m = parsedMetals.find((p) => p.id === redId);
            if (m && needToReduce > 0.00001 && m.numValue > 0.00001) {
              m.locked = false;
              if (m.numValue >= needToReduce) {
                m.numValue -= needToReduce;
                needToReduce = 0;
                break;
              } else {
                needToReduce -= m.numValue;
                m.numValue = 0;
              }
            }
          }

          if (needToReduce > 0.00001) {
            for (const m of parsedMetals) {
              if (m.id !== "gold" && m.id !== editedId && m.numValue > 0.00001) {
                m.locked = false;
                if (m.numValue >= needToReduce) {
                  m.numValue -= needToReduce;
                  needToReduce = 0;
                  break;
                } else {
                  needToReduce -= m.numValue;
                  m.numValue = 0;
                }
              }
            }
          }
        } else {
          let surplus = delta;
          // First replenish any metals below baseline (excluding editedId and gold and silver)
          for (const m of parsedMetals) {
            if (
              m.id !== "gold" &&
              m.id !== "silver" &&
              m.id !== editedId
            ) {
              const base = m.baseline !== undefined ? m.baseline : m.numValue;
              const deficit = Math.max(0, base - m.numValue);
              if (deficit > 0.00001 && surplus > 0.00001) {
                const add = Math.min(surplus, deficit);
                m.numValue += add;
                surplus -= add;
              }
            }
          }

          if (surplus > 0.00001) {
            const target =
              editedId !== "silver"
                ? parsedMetals.find((m) => m.id === "silver")
                : parsedMetals.find((m) => m.id === "copper");
            if (target) {
              target.locked = false;
              target.numValue += surplus;
            } else {
              const firstNonEdited = parsedMetals.find((m) => m.id !== editedId && m.id !== "gold");
              if (firstNonEdited) {
                firstNonEdited.locked = false;
                firstNonEdited.numValue += surplus;
              }
            }
          }
        }
      }
    }

    // Round values to 3 decimal places
    parsedMetals.forEach((m) => {
      m.numValue = Math.round(m.numValue * 1000) / 1000;
    });

    // The edited metal MUST always retain the exact typed value (rounded to 3 decimals, gold capped at 100)
    const editedEntry = parsedMetals.find((m) => m.id === editedId);
    if (editedEntry) {
      editedEntry.numValue = Math.round(newValueNum * 1000) / 1000;
    }

    // Micro-rounding adjustment to guarantee total constituent sum is precisely 100.000
    const currentSum = parsedMetals.reduce((acc, m) => acc + m.numValue, 0);
    const microDiff = Math.round((100 - currentSum) * 1000) / 1000;

    if (Math.abs(microDiff) >= 0.001) {
      const silver = parsedMetals.find((m) => m.id === "silver");
      const copper = parsedMetals.find((m) => m.id === "copper");
      if (silver && editedId !== "silver" && silver.numValue + microDiff >= 0) {
        silver.numValue = Math.round((silver.numValue + microDiff) * 1000) / 1000;
      } else if (copper && editedId !== "copper" && copper.numValue + microDiff >= 0) {
        copper.numValue = Math.round((copper.numValue + microDiff) * 1000) / 1000;
      } else {
        const anyUnlocked = parsedMetals.find(
          (m) => !m.locked && m.id !== editedId && m.numValue + microDiff >= 0
        );
        if (anyUnlocked) {
          anyUnlocked.numValue = Math.round((anyUnlocked.numValue + microDiff) * 1000) / 1000;
        }
      }
    }

    // Map to final MetalValue array with history tracking and .toFixed(3)
    return parsedMetals.map((m) => {
      const prev = prevMetals.find((x) => x.id === m.id);
      const prevValue = prev ? parseFloat(prev.value || "0") : 0;
      const adjustment = Math.round((m.numValue - prevValue) * 1000) / 1000;
      const percentChange = prevValue === 0 ? 0 : (adjustment / prevValue) * 100;

      const lastHistory =
        m.history && m.history.length > 0
          ? m.history[m.history.length - 1]
          : null;
      let newHistory = m.history ? [...m.history] : [];

      if (Math.abs(adjustment) > 0.0001) {
        const historySource = m.id === editedId ? "User Edit" : sourceName;

        if (lastHistory && lastHistory.source === historySource) {
          const totalDelta = Math.round((m.numValue - lastHistory.from) * 1000) / 1000;
          if (Math.abs(totalDelta) < 0.001) {
            // Net difference is 0.000 - the change has been completely undone/replenished!
            // Remove the history record instead of displaying 0.000 diff.
            newHistory = newHistory.slice(0, -1);
          } else {
            const totalPercent =
              lastHistory.from === 0 ? 0 : (totalDelta / lastHistory.from) * 100;
            const updatedEntry = {
              ...lastHistory,
              to: m.numValue,
              delta: totalDelta,
              percent: totalPercent,
            };
            newHistory = [...newHistory.slice(0, -1), updatedEntry];
          }
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

      // Filter out any zero-delta entries so no 0.000 difference ever lingers
      newHistory = newHistory.filter(
        (h) => Math.abs(h.delta) >= 0.001 && Math.abs(h.from - h.to) >= 0.001
      );

      const hasHistory = newHistory.length > 0;
      const latestSource = hasHistory ? newHistory[newHistory.length - 1].source : undefined;
      const baselineDiff =
        m.baseline !== undefined
          ? Math.round((m.numValue - m.baseline) * 1000) / 1000
          : 0;
      const isChangedFromBaseline =
        m.baseline !== undefined && Math.abs(baselineDiff) >= 0.001;

      let lastAdjustedBy: string | undefined = undefined;
      if (m.id === editedId) {
        lastAdjustedBy = "User";
      } else if (isChangedFromBaseline || hasHistory) {
        lastAdjustedBy =
          latestSource && latestSource !== "User Edit" ? latestSource : sourceName;
      }

      return {
        ...m,
        value: m.numValue.toFixed(3),
        previous: prevValue,
        delta: adjustment,
        percentChange,
        history: newHistory,
        lastAdjustedBy,
        changed: isChangedFromBaseline || Math.abs(adjustment) > 0.0001,
      };
    });
  };

  const balanceInitialMetals = (initialMetals: MetalValue[]) => {
    const currentSum = initialMetals.reduce((acc, m) => acc + parseFloat(m.value || "0"), 0);
    if (Math.abs(currentSum - 100) < 0.001) {
      return initialMetals.map((m) => ({
        ...m,
        value: parseFloat(m.value || "0").toFixed(3),
        locked: m.id !== "gold",
      }));
    }

    const gold = initialMetals.find((m) => m.id === "gold");
    const goldVal = gold ? gold.value : "0";
    const balanced = rebalanceMetals(initialMetals, "gold", goldVal);
    return balanced.map((m) => ({
      ...m,
      locked: m.id !== "gold",
      changed: false,
      history: [],
    }));
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
          locked: metal.toLowerCase() !== "gold",
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
        locked: false,
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
      const value = m.value;

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
        `$1$2${gold.value}`,
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
        karat: karat,
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

  const commitValue = (id: string, rawVal: string) => {
    if (rawVal === "" || rawVal === ".") return;
    const numValue = parseFloat(rawVal);
    if (isNaN(numValue)) return;
    let processedValue: string;
    if (id === "gold") {
      const clamped = Math.min(100, Math.max(0, numValue));
      processedValue = clamped.toFixed(3);
    } else {
      processedValue = numValue >= 100 ? "100.000" : numValue.toFixed(3);
    }

    setMetals((prev) => {
      if (id === "gold") {
        const purity = parseFloat(processedValue);
        setKarat(calculateKarat(purity));
        setKaratDisplay(getKaratInfo(purity).karat_display);
      }
      return rebalanceMetals(prev, id, processedValue);
    });
  };

  const handleValueChange = (id: string, newValue: string) => {
    if (newValue !== "" && !/^\d*\.?\d*$/.test(newValue)) return;

    if (id === "gold") {
      const num = parseFloat(newValue);
      if (!isNaN(num) && num > 100) {
        newValue = "100";
      }
      if (!isNaN(num) && num >= 0 && num <= 100) {
        setKarat(((num * 24) / 100).toFixed(2));
        setKaratDisplay(getKaratInfo(num).karat_display);
      }
    }

    setLastEditedId(id);
    setTempValues((prev) => ({ ...prev, [id]: newValue }));

    if (rebalanceTimeoutRef.current) {
      clearTimeout(rebalanceTimeoutRef.current);
    }

    rebalanceTimeoutRef.current = setTimeout(() => {
      if (newValue === "" || newValue === "." || newValue.endsWith(".")) return;

      commitValue(id, newValue);
      setTempValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      rebalanceTimeoutRef.current = null;
    }, 1000);
  };

  const handleValueBlur = (_id?: string) => {
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
    if (rebalanceTimeoutRef.current) {
      clearTimeout(rebalanceTimeoutRef.current);
      rebalanceTimeoutRef.current = null;
    }

    setTempValues({});
    setLastEditedId(null);

    let resetBalanced: MetalValue[] = [];
    setMetals((prev) => {
      const originalMetals = prev.filter((m) => m.baseline !== undefined);

      const baseList = originalMetals.map((m) => {
        const base = m.baseline ?? 0;

        return {
          ...m,
          value: base.toFixed(3),
          locked: m.id !== "gold",
          isManual: false,
          history: [],
          changed: false,
        };
      });

      const balanced = balanceInitialMetals(baseList);
      resetBalanced = balanced.map((m) => ({
        ...m,
        history: [],
        changed: false,
        locked: m.id !== "gold",
      }));
      return resetBalanced;
    });

    const goldMetal = resetBalanced.find((m) => m.id === "gold");
    if (goldMetal) {
      const purity = parseFloat(goldMetal.value);
      setKarat(calculateKarat(purity));
      setKaratDisplay(getKaratInfo(purity).karat_display);
    } else {
      setKarat(baselineKarat);
      setKaratDisplay(getKaratInfo(parseFloat(baselineKarat) * 100 / 24).karat_display);
    }
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
    .reduce(
      (acc, m) => acc + (parseFloat(tempValues[m.id] ?? m.value) || 0),
      0
    )
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
          baseline: 0,
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
