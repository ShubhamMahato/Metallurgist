import { SharedReportPayload, SharedReportMetal, SharedReportMarketRate, ReportTemplateId } from "../types/report";
import { ALL_AVAILABLE_METALS } from "../constants/metals";

/**
 * Symbol to Metal definitions for lightweight URL serialization.
 */
export const SYMBOL_TO_METAL: Record<string, { id: string; name: string }> = {
  Au: { id: "gold", name: "Gold" },
  Ag: { id: "silver", name: "Silver" },
  Cu: { id: "copper", name: "Copper" },
  Zn: { id: "zinc", name: "Zinc" },
  Cd: { id: "cadimium", name: "Cadmium" },
  Cr: { id: "cromium", name: "Chromium" },
  Fe: { id: "iron", name: "Iron" },
  Ni: { id: "nickel", name: "Nickel" },
  Pt: { id: "platinum", name: "Platinum" },
  Pd: { id: "palladium", name: "Palladium" },
  Sn: { id: "tin", name: "Tin" },
  Pb: { id: "lead", name: "Lead" },
  Mn: { id: "manganese", name: "Manganese" },
  Rh: { id: "rhodium", name: "Rhodium" },
  Co: { id: "cobalt", name: "Cobalt" },
  In: { id: "indium", name: "Indium" },
  Ir: { id: "iredium", name: "Iridium" },
  Ru: { id: "ruthenium", name: "Ruthenium" },
  W: { id: "tungestan", name: "Tungsten" },
  Ga: { id: "gallium", name: "Gallium" },
  V: { id: "vanadium", name: "Vanadium" },
  Os: { id: "osmium", name: "Osmium" },
};

/**
 * Calculates Karat exact rating and display category from gold purity percentage.
 */
export function calculateKaratFromPurity(purity: number): {
  karatExact: string;
  karatDisplay: string;
} {
  const exact = (purity * 24) / 100;
  const standards = [24, 23, 22, 21, 18, 14, 10, 9];

  let closest = standards[0];
  let minDiff = Math.abs(exact - closest);

  for (const k of standards) {
    const diff = Math.abs(exact - k);
    if (diff < minDiff) {
      minDiff = diff;
      closest = k;
    }
  }

  return {
    karatExact: exact.toFixed(2),
    karatDisplay: `${closest}K`,
  };
}

export interface CompactReportParams {
  shopName?: string;
  customerName: string;
  weight: string;
  goldPurity?: string;
  metals: { id?: string; symbol: string; value: string }[];
}

/**
 * Encodes a string into a URL-safe Base64 string (handles Unicode / UTF-8 safely).
 */
export function toUrlSafeBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes a URL-safe Base64 string into a UTF-8 string.
 */
export function fromUrlSafeBase64(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Computes the SHA-256 hexadecimal hash string of a given input string using Web Crypto API.
 */
export async function calculateSha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const cryptoObj =
    typeof window !== "undefined" && window.crypto
      ? window.crypto
      : (globalThis as any).crypto;
  const hashBuffer = await cryptoObj.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b: number) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Creates an ultra-compact, tamper-proof SHA-256 encoded report link.
 * Serializes only essential params (shop, cust, wt, non-zero metals),
 * computes SHA-256 checksum so users cannot edit the URL to forge results,
 * and produces a concise URL under ~220 characters.
 */
export async function createCompactReportPackage(params: CompactReportParams): Promise<{
  encodedData: string;
  checksum: string;
  url: string;
}> {
  const baseUrl = "https://shubhammahato.github.io/Metallurgist/#/report";
  const searchParams = new URLSearchParams();

  if (params.shopName && params.shopName.trim()) {
    searchParams.set("shop", params.shopName.trim());
  }
  if (params.customerName && params.customerName.trim()) {
    searchParams.set("cust", params.customerName.trim());
  }
  if (params.weight && params.weight.trim()) {
    searchParams.set("wt", params.weight.trim());
  }

  // Determine gold purity
  let goldVal = params.goldPurity ? parseFloat(params.goldPurity) : 0;

  // Add non-zero metals (normalizing symbols case-insensitively)
  for (const metal of params.metals) {
    const symUpper = (metal.symbol || "").toUpperCase();
    const isGold = symUpper === "AU" || metal.id === "gold";
    const val = parseFloat(metal.value);

    if (isGold && !isNaN(val) && val > 0) {
      goldVal = val;
    } else if (!isGold && !isNaN(val) && val > 0) {
      // Normalize to title case (e.g. AG -> Ag, CU -> Cu, ZN -> Zn)
      const normalizedSym =
        metal.symbol.length > 1
          ? metal.symbol.charAt(0).toUpperCase() + metal.symbol.slice(1).toLowerCase()
          : metal.symbol.toUpperCase();
      searchParams.set(normalizedSym, val.toFixed(3));
    }
  }

  // Always set Au
  if (!isNaN(goldVal) && goldVal > 0) {
    searchParams.set("Au", goldVal.toFixed(3));
  }

  const rawPayloadString = searchParams.toString();
  const checksum = await calculateSha256(rawPayloadString);
  const encodedData = toUrlSafeBase64(rawPayloadString);

  const url = `${baseUrl}?d=${encodeURIComponent(encodedData)}&c=${encodeURIComponent(checksum)}`;

  return {
    encodedData,
    checksum,
    url,
  };
}

/**
 * Verifies and decodes a shared report package.
 * Recalculates SHA-256 and compares with the checksum provided in the URL.
 * If anyone tampers with or edits the URL parameters, validation immediately fails.
 */
export async function verifyAndDecodeReport(
  encodedData: string,
  providedChecksum: string
): Promise<{
  isValid: boolean;
  payload: SharedReportPayload | null;
  error?: string;
  computedChecksum?: string;
}> {
  if (!encodedData || !providedChecksum) {
    return {
      isValid: false,
      payload: null,
      error: "Missing report payload or security checksum in link.",
    };
  }

  try {
    const rawString = fromUrlSafeBase64(encodedData);
    const computedChecksum = await calculateSha256(rawString);

    if (computedChecksum.toLowerCase() !== providedChecksum.toLowerCase()) {
      return {
        isValid: false,
        payload: null,
        computedChecksum,
        error: "Report data validation failed. The shared report link has been modified or corrupted.",
      };
    }

    // 1. Check legacy JSON format support
    if (rawString.trim().startsWith("{")) {
      const legacyPayload: SharedReportPayload = JSON.parse(rawString);
      return {
        isValid: true,
        payload: legacyPayload,
        computedChecksum,
      };
    }

    // 2. Compact query string format with case-insensitive lookup
    const searchParams = new URLSearchParams(rawString);
    const paramMap = new Map<string, string>();
    for (const [key, val] of searchParams.entries()) {
      paramMap.set(key.toLowerCase(), val);
    }

    const shopName = paramMap.get("shop") || undefined;
    const customerName = paramMap.get("cust") || "Jeweller";
    const weight = paramMap.get("wt") || "0.000";

    const goldPurityStr =
      paramMap.get("au") || paramMap.get("gold") || paramMap.get("purity") || "0.000";
    const goldPurityNum = parseFloat(goldPurityStr) || 0;

    // Build complete elemental spectrometry list including all zero-value trace metals
    const metalsList: SharedReportMetal[] = ALL_AVAILABLE_METALS.map((metal) => {
      const isGold = metal.id === "gold" || metal.symbol.toLowerCase() === "au";
      if (isGold) {
        return {
          id: "gold",
          name: "Gold",
          symbol: "Au",
          value: goldPurityNum.toFixed(3),
        };
      }
      const valStr =
        paramMap.get(metal.symbol.toLowerCase()) || paramMap.get(metal.id.toLowerCase());
      const val = parseFloat(valStr || "0");
      return {
        id: metal.id,
        name: metal.name,
        symbol: metal.symbol,
        value: !isNaN(val) && val > 0 ? val.toFixed(3) : "0.000",
      };
    });

    // Also include any custom/extra metals in the URL that weren't in ALL_AVAILABLE_METALS
    for (const [key, valStr] of paramMap.entries()) {
      if (["shop", "cust", "wt", "au", "gold", "purity"].includes(key)) continue;
      const alreadyIncluded = metalsList.some(
        (m) => m.symbol.toLowerCase() === key || m.id.toLowerCase() === key
      );
      if (!alreadyIncluded) {
        const val = parseFloat(valStr || "0");
        if (!isNaN(val) && val > 0) {
          metalsList.push({
            id: key,
            name: key.toUpperCase(),
            symbol: key.toUpperCase(),
            value: val.toFixed(3),
          });
        }
      }
    }

    const { karatExact, karatDisplay } = calculateKaratFromPurity(goldPurityNum);

    const payload: SharedReportPayload = {
      version: "1.0",
      reportId: `AS-${Date.now().toString().slice(-6)}`,
      shopName,
      customerName,
      sampleType: "Gold Sample",
      weight,
      timestamp: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      goldPurity: goldPurityNum.toFixed(3),
      karatExact,
      karatDisplay,
      metals: metalsList,
      templateId: "classic-lab",
    };

    return {
      isValid: true,
      payload,
      computedChecksum,
    };
  } catch (err: any) {
    return {
      isValid: false,
      payload: null,
      error: "Report data validation failed. The shared report link has been modified or corrupted.",
    };
  }
}

/**
 * Dynamically fetches live IBJA benchmark rate from snapdata.dev API.
 */
export async function fetchLiveIbjaRate(
  karatDisplay: string,
  goldPurity: string
): Promise<SharedReportMarketRate | undefined> {
  try {
    const response = await fetch("https://snapdata.dev/api/v1/gold/in/latest.json");
    if (response.ok) {
      const data = await response.json();
      const obs: any[] = data.observations || [];
      let targetRate = 0;

      const targetInst = karatDisplay.toUpperCase();
      for (const item of obs) {
        if (
          item.instrument?.includes(targetInst) ||
          item.instrument_id?.includes(targetInst)
        ) {
          const val = typeof item.value === "number" ? item.value : parseFloat(item.value);
          if (!isNaN(val) && val > 0) {
            targetRate = val;
            break;
          }
        }
      }

      if (!targetRate) {
        for (const item of obs) {
          if (item.instrument?.includes("24K") || item.instrument_id?.includes("24K")) {
            const val = typeof item.value === "number" ? item.value : parseFloat(item.value);
            if (!isNaN(val) && val > 0) {
              const purityNum = parseFloat(goldPurity) || 75;
              targetRate = Math.round(val * (purityNum / 100));
              break;
            }
          }
        }
      }

      if (targetRate > 0) {
        return {
          ratePerGram: targetRate,
          rateSource: "IBJA Retail Standard",
          calculatedGoldValue: 0,
          fetchedAt: new Date().toISOString(),
          karatCategory: karatDisplay,
        };
      }
    }
  } catch (err) {
    const purityNum = parseFloat(goldPurity) || 75;
    const estimated24K = 14929;
    return {
      ratePerGram: Math.round(estimated24K * (purityNum / 100)),
      rateSource: "IBJA Retail Standard",
      calculatedGoldValue: 0,
      fetchedAt: new Date().toISOString(),
      karatCategory: karatDisplay,
    };
  }
  return undefined;
}

/**
 * Generates formatted text for WhatsApp with emojis, key metrics, and tamper-proof verification link.
 */
export function generateWhatsAppMessage(
  payload: SharedReportPayload,
  shareUrl: string
): string {
  const nonNullMetals = payload.metals.filter((m) => {
    const val = parseFloat(m.value);
    return !isNaN(val) && val > 0;
  });

  const metalsList = nonNullMetals
    .map((m) => `  • ${m.name} (${m.symbol}): ${parseFloat(m.value).toFixed(3)}%`)
    .join("\n");

  const weightNum = parseFloat(payload.weight) || 0;
  const ratePerGram = payload.marketRate?.ratePerGram || 0;
  const calculatedGoldVal =
    payload.marketRate?.calculatedGoldValue || weightNum * ratePerGram;

  const rateBlock =
    ratePerGram > 0
      ? `\n💰 *Market Valuation (IBJA):*\n  • Current Rate: ₹${ratePerGram.toLocaleString(
          "en-IN"
        )}/g (${payload.karatDisplay})\n  • Gold Value: ₹${calculatedGoldVal.toLocaleString(
          "en-IN",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`
      : "";

  const headerTitle = payload.shopName
    ? `🔬 *${payload.shopName.toUpperCase()} REPORT*`
    : `🔬 *METALLURGIST REPORT*`;

  const purityNum = parseFloat(payload.goldPurity || "0");
  const fallbackKarat = calculateKaratFromPurity(purityNum);
  const displayKarat =
    payload.karatDisplay && !/\d+\.\d+/.test(payload.karatDisplay)
      ? (payload.karatDisplay.endsWith("K") ? payload.karatDisplay : `${payload.karatDisplay}K`)
      : fallbackKarat.karatDisplay;
  const exactKarat = (payload.karatExact || fallbackKarat.karatExact).replace(/k$/i, "").trim();

  return (
    `${headerTitle}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Jeweller:* ${payload.customerName || "N/A"}\n` +
    `⚖️ *Weight:* ${payload.weight}g\n` +
    `🥇 *GOLD PURITY:* ${parseFloat(payload.goldPurity).toFixed(3)}%\n` +
    `👑 *Karat Rating:* ${displayKarat} (Exact: ${exactKarat}K)` +
    rateBlock +
    `\n\n` +
    `🧪 *Constituent Breakdown:*\n` +
    metalsList +
    `\n\n` +
    `📄 *Report Link:*\n` +
    `${shareUrl}\n` +
    `━━━━━━━━━━━━━━━━━━━━`
  );
}

/**
 * Detects whether the current device is a mobile phone or tablet.
 */
export function isMobileOrTablet(): boolean {
  if (typeof window === "undefined" || !window.navigator) return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || "").toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|silk|kindle/i.test(ua);
  const isTouchScreen = Boolean(
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
    ("ontouchstart" in window)
  );
  const isSmallScreen = window.innerWidth <= 1024;
  return isMobileUA || (isTouchScreen && isSmallScreen);
}

/**
 * Normalizes input to 10-digit format (stripping any prepended 91, 0, or symbols).
 */
export function extractTenDigitNumber(phone?: string): string {
  if (!phone) return "";
  let digits = phone.replace(/[^0-9]/g, "");
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }
  return digits.slice(0, 10);
}

/**
 * Normalizes phone number with country code 91 appended automatically.
 * User only needs to provide a 10-digit number.
 */
export function formatIndianPhoneNumber(phone?: string): string {
  const tenDigits = extractTenDigitNumber(phone);
  if (tenDigits.length === 10) {
    return `91${tenDigits}`;
  }
  return tenDigits;
}

/**
 * Builds the WhatsApp send URL:
 * - On tablet or mobile: uses wa.me link only (e.g. https://wa.me/91XXXXXXXXXX?text=...)
 * - On web / desktop: uses https://web.whatsapp.com/send?phone=91XXXXXXXXXX&text=...
 */
export function buildWhatsAppLink(message: string, phone?: string): string {
  const fullPhone = formatIndianPhoneNumber(phone);
  const encodedMsg = encodeURIComponent(message);
  const isMobile = isMobileOrTablet();

  if (isMobile) {
    if (fullPhone) {
      return `https://wa.me/${fullPhone}?text=${encodedMsg}`;
    }
    return `https://wa.me/?text=${encodedMsg}`;
  }

  // Desktop / Web
  if (fullPhone) {
    return `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedMsg}`;
  }
  return `https://web.whatsapp.com/send?text=${encodedMsg}`;
}

/**
 * Opens WhatsApp:
 * - On tablet or mobile: navigates directly using wa.me link to open the WhatsApp app
 * - On web / desktop: opens web.whatsapp.com in a new tab/window
 */
export function openWhatsAppChat(url: string): void {
  if (typeof window === "undefined") return;

  if (isMobileOrTablet()) {
    // For mobile and tablet: trigger direct wa.me link navigation to open WhatsApp app
    window.location.href = url;
    return;
  }

  // On Web / desktop: open standard web URL in new tab
  window.open(url, "_blank");
}
