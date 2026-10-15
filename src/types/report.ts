export type ReportTemplateId =
  | "classic-lab"
  | "luxury-gold"
  | "modern-minimal"
  | "hallmark-official"
  | "compact-slip"
  | "technical-spectrum";

export interface SharedReportMetal {
  id: string;
  name: string;
  symbol: string;
  value: string;
  baseline?: number;
}

export interface SharedReportMarketRate {
  ratePerGram: number;
  rateSource: string;
  calculatedGoldValue: number;
  fetchedAt: string;
  karatCategory: string; // e.g. "18K", "22K", "24K"
}

export interface SharedReportPayload {
  version: string;
  reportId: string;
  customerName: string;
  sampleType: string;
  weight: string;
  timestamp: string;
  goldPurity: string;
  karatExact: string;
  karatDisplay: string;
  metals: SharedReportMetal[];
  marketRate?: SharedReportMarketRate;
  templateId: ReportTemplateId;
}

export interface ReportTemplateMeta {
  id: ReportTemplateId;
  name: string;
  description: string;
  badge: string;
  accentColor: string;
}

export const REPORT_TEMPLATES: ReportTemplateMeta[] = [
  {
    id: "classic-lab",
    name: "Classic Laboratory",
    description: "Official laboratory assay sheet with Fischer-standard tabular format & dashed borders.",
    badge: "Lab Standard",
    accentColor: "slate",
  },
  {
    id: "luxury-gold",
    name: "Prestige Jeweler",
    description: "High-end bullion house certificate with warm gold accents, ornamental borders & seal.",
    badge: "Prestige",
    accentColor: "amber",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean Swiss architectural grid with high-contrast typography and sleek badges.",
    badge: "Contemporary",
    accentColor: "blue",
  },
  {
    id: "hallmark-official",
    name: "Hallmark Bureau",
    description: "Official standards bureau layout with security emblem, serial numbering & compliance check.",
    badge: "BIS / Hallmark",
    accentColor: "emerald",
  },
  {
    id: "compact-slip",
    name: "Retail Assay Slip",
    description: "Countertop voucher format optimized for fast billing, jewelry receipts & customer copies.",
    badge: "Retail Slip",
    accentColor: "purple",
  },
  {
    id: "technical-spectrum",
    name: "XRF Spectrum",
    description: "Diagnostic spectrometer analysis featuring elemental distribution metrics & tolerance ratings.",
    badge: "Spectrometry",
    accentColor: "cyan",
  },
];
