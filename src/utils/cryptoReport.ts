import { SharedReportPayload, ReportTemplateId } from "../types/report";

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
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Serializes and prepares a cryptographic report package containing URL-safe base64 data and SHA-256 checksum.
 */
export async function createCryptographicReport(payload: SharedReportPayload): Promise<{
  encodedData: string;
  checksum: string;
  serializedJson: string;
}> {
  const serializedJson = JSON.stringify(payload);
  const checksum = await calculateSha256(serializedJson);
  const encodedData = toUrlSafeBase64(serializedJson);
  return { encodedData, checksum, serializedJson };
}

/**
 * Verifies and decodes a shared report package.
 * Recalculates SHA-256 and compares with the checksum provided in the URL.
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
    const jsonStr = fromUrlSafeBase64(encodedData);
    const computedChecksum = await calculateSha256(jsonStr);

    if (computedChecksum.toLowerCase() !== providedChecksum.toLowerCase()) {
      return {
        isValid: false,
        payload: null,
        computedChecksum,
        error:
          "Report data validation failed. The shared report may have been modified or corrupted.",
      };
    }

    const payload: SharedReportPayload = JSON.parse(jsonStr);
    return {
      isValid: true,
      payload,
      computedChecksum,
    };
  } catch (err: any) {
    return {
      isValid: false,
      payload: null,
      error:
        "Report data validation failed. The shared report may have been modified or corrupted.",
    };
  }
}

/**
 * Builds the full report URL for sharing.
 * Hosted on GitHub Pages: https://shubhammahato.github.io/Metallurgist/#/report
 */
export function buildReportShareUrl(
  encodedData: string,
  checksum: string,
  templateId: ReportTemplateId
): string {
  const baseUrl = "https://shubhammahato.github.io/Metallurgist/#/report";
  return `${baseUrl}?d=${encodeURIComponent(
    encodedData
  )}&c=${encodeURIComponent(checksum)}&t=${encodeURIComponent(templateId)}`;
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

  return (
    `${headerTitle}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Jeweller:* ${payload.customerName || "N/A"}\n` +
    `🏷️ *Sample:* ${payload.sampleType || "Sample"} | ⚖️ *Weight:* ${payload.weight}g\n` +
    `📅 *Date:* ${payload.timestamp}\n\n` +
    `🥇 *GOLD PURITY:* ${parseFloat(payload.goldPurity).toFixed(3)}%\n` +
    `👑 *Karat Rating:* ${payload.karatDisplay} (Exact: ${payload.karatExact}K)` +
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

declare global {
  interface Window {
    __metallurgist_wa_popup?: Window | null;
  }
}

// Window reference tracker to control and reuse the same popup window on web
const WA_POPUP_WINDOW_NAME = "metallurgist_whatsapp_popup_window";

/**
 * Opens WhatsApp:
 * - On mobile/tablet: launches native WhatsApp app via wa.me link directly
 * - On web: opens in a new standalone window (popup, not a tab) and controls it so
 *   subsequent clicks reuse that SAME window and update its URL instead of opening a new window or tab.
 */
export function openWhatsAppChat(url: string): void {
  if (typeof window === "undefined") return;

  if (isMobileOrTablet()) {
    // For mobile and tablet: trigger direct wa.me link navigation to open WhatsApp app
    window.location.href = url;
    return;
  }

  // On Web / desktop:
  // Explicitly specify window dimensions and features to force modern browsers
  // to open a NEW POPUP WINDOW rather than a new browser tab.
  const screenW = window.screen.availWidth || 1280;
  const screenH = window.screen.availHeight || 800;
  const width = Math.min(1050, Math.max(800, Math.floor(screenW * 0.75)));
  const height = Math.min(850, Math.max(650, Math.floor(screenH * 0.85)));
  const left = Math.max(0, Math.floor((screenW - width) / 2));
  const top = Math.max(0, Math.floor((screenH - height) / 2));
  const windowFeatures = `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes,toolbar=no,menubar=no,location=yes`;

  const existingPopup = window.__metallurgist_wa_popup;

  // 1. If we have a reference to an already opened window, reuse it and change its URL
  if (existingPopup) {
    try {
      // First attempt: direct write-only navigation and focus
      existingPopup.location.href = url;
      existingPopup.focus();
      return;
    } catch {
      // If direct location write is restricted, try navigating the existing named window without features
      try {
        const reused = window.open(url, WA_POPUP_WINDOW_NAME);
        if (reused) {
          window.__metallurgist_wa_popup = reused;
          reused.focus();
          return;
        }
      } catch {
        // Fall through to open a new popup
      }
    }
  }

  // 2. Open in a new standalone window (not a tab) and save reference to control it
  try {
    const newPopup = window.open(url, WA_POPUP_WINDOW_NAME, windowFeatures);
    window.__metallurgist_wa_popup = newPopup;
    if (newPopup) {
      newPopup.focus();
    }
  } catch (err) {
    console.error("Could not open WhatsApp window:", err);
    window.open(url, WA_POPUP_WINDOW_NAME);
  }
}
