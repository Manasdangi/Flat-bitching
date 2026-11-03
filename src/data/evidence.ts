// Extra public evidence per sector, each with its source. Read from public web pages (not bulk-scraped);
// what each page says is paraphrased and dated. Sectors not listed simply weren't named in these sources.
export const SRC = {
  tribune2026: { label: "The Tribune, 8 Aug 2026", url: "https://www.tribuneindia.com/news/haryana/97mm-rainfall-floods-millennium-city-again-old-gurugram-areas-worst-hit/" },
  tribune2025: { label: "The Tribune, 27 Aug 2025", url: "https://www.tribuneindia.com/news/haryana/despite-rs-500-cr-spend-gurugram-sinks-every-monsoon" },
  indiatv2025: { label: "India TV, 3 Sep 2025", url: "https://www.indiatvnews.com/haryana/clogged-drains-encroachments-how-gurugrams-urban-failures-fuel-monsoon-flooding-every-year-2025-09-03-1006468" },
  police2024: { label: "The Tribune, 8 Jul 2024", url: "https://www.tribuneindia.com/news/haryana/gurugram-police-identify-over-25-unsafe-spots-for-women-637807" },
  sqyWater: { label: "Square Yards, Apr 2026", url: "https://www.squareyards.com/gurugram/infra/water-supply" },
  sqyRent: { label: "Square Yards listings", url: "https://www.squareyards.com/rent/2-bhk-for-rent-in-gurgaon" },
} as const;
export type SrcKey = keyof typeof SRC;
export type Evidence = { src: SrcKey; note: string; tone: "bad" | "good" | "info" };

const FLOOD_2025 = "Named among the sectors hit by the Aug 2025 flooding.";
const f2025 = (): Evidence => ({ src: "tribune2025", note: FLOOD_2025, tone: "bad" });

/** Flood reports. tone "info" = drainage under stress but not reported flooded (doesn't change the flood level). */
export const FLOOD_EV: Record<string, Evidence[]> = {
  ...Object.fromEntries(["4", "5", "12", "22", "23", "30", "31", "40", "45", "47", "48", "51"].map((id) => [id, [f2025()]])),
  "9": [
    { src: "tribune2026", note: "Flooding from blocked drains reported in Aug 2026.", tone: "bad" },
    { src: "indiatv2025", note: "Sector 9A (Bhardwaj Chowk) named as a waterlogging hotspot.", tone: "bad" },
  ],
  "14": [{ src: "tribune2026", note: "Drainage network described as under severe pressure from dense stilt-plus-four building.", tone: "info" }],
  "17": [{ src: "tribune2026", note: "Drainage network described as under severe pressure from dense stilt-plus-four building (not reported flooded).", tone: "info" }],
  "28": [{ src: "indiatv2025", note: "Chakkarpur named as a waterlogging hotspot.", tone: "bad" }],
  "38": [{ src: "indiatv2025", note: "Tau Devi Lal Stadium area named as a waterlogging hotspot.", tone: "bad" }],
};

const NEW_GGN = ["81", "82", "83", "84", "85", "86", "88a", "88b", "89", "90", "91", "92", "93", "95", "99", "99a", "110", "37d"];
/** Water-supply assessments from a real-estate portal (a commercial source: used as a second opinion, with conflicts shown). */
export const WATER_EV: Record<string, Evidence[]> = {
  ...Object.fromEntries(["21", "47", "51", "57"].map((id) => [id, [{ src: "sqyWater" as SrcKey, note: "Listed with reported pressure and supply issues.", tone: "bad" as const }]])),
  ...Object.fromEntries(NEW_GGN.map((id) => [id, [{ src: "sqyWater" as SrcKey, note: "Listed among New Gurugram areas where water infrastructure is still catching up.", tone: "info" as const }]])),
  ...Object.fromEntries(["4", "14", "15", "54", "56"].map((id) => [id, [{ src: "sqyWater" as SrcKey, note: "Listed as having good water infrastructure.", tone: "good" as const }]])),
};

/** Named spots police flagged as unsafe for women (2024). A spot, not the whole sector. */
export const SAFETY_EV: Record<string, Evidence[]> = {
  "49": [{ src: "police2024", note: "Vatika Chowk", tone: "bad" }],
  "52": [{ src: "police2024", note: "Government Girls' College area", tone: "bad" }],
  "22": [{ src: "police2024", note: "an area in the sector", tone: "bad" }],
  "29": [{ src: "police2024", note: "an area in the sector", tone: "bad" }],
  "48": [{ src: "police2024", note: "an area in the sector", tone: "bad" }],
};

/** Asking rents for 2 BHK read from Square Yards listing pages (first page of results only), ₹ thousand/month. */
export type RentCheck = { median?: number; min: number; max: number; n?: number; date: string; sqft: number };
export const RENT_CHECK: Record<string, RentCheck> = {
  "28": { median: 45, min: 30, max: 70, n: 15, date: "Aug 2026", sqft: 40 },
  "43": { median: 48, min: 32, max: 130, n: 25, date: "Sep 2026", sqft: 54 },
  "49": { median: 38, min: 22, max: 55, n: 22, date: "Jul 2026", sqft: 29 },
  "50": { median: 45, min: 31, max: 80, n: 25, date: "Oct 2026", sqft: 42 },
  "54": { median: 40, min: 31, max: 145, n: 13, date: "Aug 2026", sqft: 60 },
  "56": { min: 35, max: 60, date: "Oct 2026", sqft: 35 },
  "57": { median: 45, min: 29, max: 65, n: 25, date: "Oct 2026", sqft: 31 },
  "65": { median: 65, min: 40, max: 125, n: 25, date: "Aug 2026", sqft: 41 },
  "82": { median: 25, min: 20, max: 35, n: 25, date: "Oct 2026", sqft: 22 },
  "84": { median: 29, min: 14.5, max: 42, n: 24, date: "Nov 2026", sqft: 18 },
  "102": { median: 23.5, min: 16, max: 45, n: 25, date: "Nov 2026", sqft: 29 },
};
