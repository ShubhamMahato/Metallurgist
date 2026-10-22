export type KaratOption = "22K" | "24K" | "18K";
export type JewellerId = "joyalukkas" | "malabar";

export interface KaratRateData {
  perGram: number;
  per10Gram: number;
  close: number;
  changePct?: number;
}

export interface JewellerInfo {
  id: JewellerId;
  name: string;
  badge: string;
  isDefault?: boolean;
}

export const JEWELLERS: JewellerInfo[] = [
  { id: "joyalukkas", name: "Joyalukkas", badge: "Daily Rate", isDefault: true },
  { id: "malabar", name: "Malabar Gold", badge: "Live Rate" },
];

export const DEFAULT_JEWELLER_RATES: Record<JewellerId, Record<KaratOption, KaratRateData>> = {
  joyalukkas: {
    "22K": { perGram: 13235, per10Gram: 132350, close: 13235 },
    "24K": { perGram: 14438, per10Gram: 144380, close: 14438 },
    "18K": { perGram: 10829, per10Gram: 108290, close: 10829 },
  },
  malabar: {
    "22K": { perGram: 13235, per10Gram: 132350, close: 13235 },
    "24K": { perGram: 14438, per10Gram: 144380, close: 14438 },
    "18K": { perGram: 10835, per10Gram: 108350, close: 10835 },
  },
};

const JOYALUKKAS_QUERY =
  "query getgoldrates{getgoldrates{Id Message Status metal_rate_time Data{Id BRANCH_CODE BRANCH_NAME GOLD_14KT_RATE GOLD_18KT_RATE GOLD_22KT_RATE GOLD_24KT_RATE SILVER_RATE SILVER_RATE100 SILVER_RATE999 PLATINUM_RATE __typename}__typename}}";

const MALABAR_QUERY =
  "query getMetalRate($filter: MetalRateFilterInput) { getMetalRate(filter: $filter) { items { entry_date entry_time purity unit rate country state } } }";

export interface FetchRatesResult {
  jeweller: JewellerId;
  rates: Record<KaratOption, KaratRateData>;
  updatedAt?: string;
}

export function getCachedJewellerRates(jeweller: JewellerId): Record<KaratOption, KaratRateData> {
  try {
    const saved = localStorage.getItem(`metallurgist_rates_${jeweller}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed["22K"] && parsed["24K"] && parsed["18K"]) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_JEWELLER_RATES[jeweller];
}

export async function fetchJewellerRates(jeweller: JewellerId): Promise<FetchRatesResult> {
  const fallback = getCachedJewellerRates(jeweller);

  if (jeweller === "joyalukkas") {
    try {
      const isDev = import.meta.env.DEV;
      const baseUrl = isDev ? "/api/joyalukkas" : "https://www.joyalukkas.in";
      const url = `${baseUrl}/graphql?query=${encodeURIComponent(
        JOYALUKKAS_QUERY
      )}&operationName=getgoldrates&variables=%7B%7D`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error(`Joyalukkas responded with ${response.status}`);
      const json = await response.json();
      const item = json?.data?.getgoldrates?.Data?.[0];

      const r18 = parseFloat(item?.GOLD_18KT_RATE);
      const r22 = parseFloat(item?.GOLD_22KT_RATE);
      const r24 = parseFloat(item?.GOLD_24KT_RATE);

      if (r18 > 0 && r22 > 0 && r24 > 0) {
        const rates: Record<KaratOption, KaratRateData> = {
          "18K": { perGram: r18, per10Gram: r18 * 10, close: r18 },
          "22K": { perGram: r22, per10Gram: r22 * 10, close: r22 },
          "24K": { perGram: r24, per10Gram: r24 * 10, close: r24 },
        };
        try {
          localStorage.setItem(`metallurgist_rates_${jeweller}`, JSON.stringify(rates));
        } catch {}

        return {
          jeweller,
          rates,
          updatedAt: json?.data?.getgoldrates?.metal_rate_time || undefined,
        };
      }
    } catch (err) {
      console.warn("Could not fetch Joyalukkas rate, using cache:", err);
    }
    return { jeweller, rates: fallback };
  }

  // Malabar Gold
  if (jeweller === "malabar") {
    try {
      const isDev = import.meta.env.DEV;
      const baseUrl = isDev ? "/api/malabar" : "https://www.malabargoldanddiamonds.com";
      const vars = encodeURIComponent(
        JSON.stringify({ filter: { metal_type: "gold", country: "India" } })
      );
      const url = `${baseUrl}/graphql-magento?query=${encodeURIComponent(
        MALABAR_QUERY
      )}&variables=${vars}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error(`Malabar responded with ${response.status}`);
      const json = await response.json();
      const items: any[] = json?.data?.getMetalRate?.items || [];

      let r18 = 0;
      let r22 = 0;
      let r24 = 0;
      let latestTime: string | undefined;

      for (const it of items) {
        const p = String(it.purity || "").toLowerCase().trim();
        const val = parseFloat(it.rate);
        if (isNaN(val) || val <= 0) continue;

        if (p === "18k" || p === "18kt") {
          r18 = val;
          if (it.entry_date && it.entry_time) latestTime = `${it.entry_date} ${it.entry_time}`;
        } else if (p === "22k" || p === "22kt") {
          r22 = val;
        } else if (p === "24k" || p === "24kt") {
          r24 = val;
        }
      }

      if (r18 > 0 && r22 > 0 && r24 > 0) {
        const rates: Record<KaratOption, KaratRateData> = {
          "18K": { perGram: r18, per10Gram: r18 * 10, close: r18 },
          "22K": { perGram: r22, per10Gram: r22 * 10, close: r22 },
          "24K": { perGram: r24, per10Gram: r24 * 10, close: r24 },
        };
        try {
          localStorage.setItem(`metallurgist_rates_${jeweller}`, JSON.stringify(rates));
        } catch {}

        return {
          jeweller,
          rates,
          updatedAt: latestTime,
        };
      }
    } catch (err) {
      console.warn("Could not fetch Malabar rate, using cache:", err);
    }
    return { jeweller, rates: fallback };
  }

  return { jeweller, rates: fallback };
}
