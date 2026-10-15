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
 */
export function buildReportShareUrl(
  encodedData: string,
  checksum: string,
  templateId: ReportTemplateId
): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  // HashRouter uses /#/report
  return `${origin}${pathname}#/report?d=${encodeURIComponent(
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

  return (
    `🔬 *METALLURGIST ASSAY REPORT*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Customer:* ${payload.customerName || "N/A"}\n` +
    `🏷️ *Sample:* ${payload.sampleType || "Sample"} | ⚖️ *Weight:* ${payload.weight}g\n` +
    `📅 *Date:* ${payload.timestamp}\n\n` +
    `🥇 *GOLD PURITY:* ${parseFloat(payload.goldPurity).toFixed(3)}%\n` +
    `👑 *Karat Rating:* ${payload.karatDisplay} (Exact: ${payload.karatExact}K)` +
    rateBlock +
    `\n\n` +
    `🧪 *Constituent Breakdown:*\n` +
    metalsList +
    `\n\n` +
    `🔐 *Verified Tamper-Proof Certificate:*\n` +
    `${shareUrl}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `_Digitally verified via SHA-256 cryptographic checksum._`
  );
}

/**
 * Builds the WhatsApp web / mobile send URL.
 */
export function buildWhatsAppLink(message: string, phone?: string): string {
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  const encodedMsg = encodeURIComponent(message);
  
  if (cleanPhone) {
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
  }
  return `https://web.whatsapp.com/send?text=${encodedMsg}`;
}
