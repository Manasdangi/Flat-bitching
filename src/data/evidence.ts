// Extra public evidence per sector, each with its source. Read from public web pages (not bulk-scraped);
// what each page says is paraphrased and dated. Sectors not listed simply weren't named in these sources.
export const SRC = {
  tribune2026: { label: "The Tribune, 8 Aug 2026", url: "https://www.tribuneindia.com/news/haryana/97mm-rainfall-floods-millennium-city-again-old-gurugram-areas-worst-hit/" },
  tribune2025: { label: "The Tribune, 27 Aug 2025", url: "https://www.tribuneindia.com/news/haryana/despite-rs-500-cr-spend-gurugram-sinks-every-monsoon" },
  indiatv2025: { label: "India TV, 3 Sep 2025", url: "https://www.indiatvnews.com/haryana/clogged-drains-encroachments-how-gurugrams-urban-failures-fuel-monsoon-flooding-every-year-2025-09-03-1006468" },
  tribune70: { label: "The Tribune, 29 Oct 2026", url: "https://www.tribuneindia.com/news/gurugram/2-women-out-for-a-walk-harassed-by-suv-borne-man-in-gurugrams-sector-70/" },
  safetipinHubs: { label: "Safetipin women's safety audit of Gurgaon hubs (undated)", url: "https://safetyscore.safetipin.com/media/56/in-gurgaon-going-to-office-is-a-risky-business/" },
  sqy56: { label: "Square Yards resident reviews, Sector 56 (82 reviews, Jan 2026)", url: "https://www.squareyards.com/reviews/locality/sector-56/63763" },
  sqy49: { label: "Square Yards resident reviews, Sector 49 (83 reviews, Jan 2026)", url: "https://www.squareyards.com/reviews/locality/sector-49/63749" },
  sqy57: { label: "Square Yards resident reviews, Sector 57 (61 reviews, Mar 2026)", url: "https://www.squareyards.com/reviews/locality/sector-57/63765" },
  sqy65: { label: "Square Yards resident reviews, Sector 65 (53 reviews, Mar 2026)", url: "https://www.squareyards.com/reviews/locality/sector-65-in-gurgaon/63781" },
  sqy67: { label: "Square Yards resident reviews, Sector 67 (52 reviews, Feb 2026)", url: "https://www.squareyards.com/reviews/locality/sector-67-in-gurgaon/63785" },
  sqy43: { label: "Square Yards resident reviews, Sector 43 (59 reviews, May 2026)", url: "https://www.squareyards.com/reviews/locality/sector-43/63737" },
  sqy46: { label: "Square Yards resident reviews, Sector 46 (79 reviews, Jan 2026)", url: "https://www.squareyards.com/reviews/locality/sector-46/63743" },
  sqy47: { label: "Square Yards resident reviews, Sector 47 (53 reviews, Oct 2026)", url: "https://www.squareyards.com/reviews/locality/sector-47/63745" },
  sqy52: { label: "Square Yards resident reviews, Sector 52 (51 reviews, Mar 2026)", url: "https://www.squareyards.com/reviews/locality/sector-52/63755" },
  sqy48: { label: "Square Yards resident reviews, Sector 48 (11 reviews, Jan 2026)", url: "https://www.squareyards.com/reviews/locality/sector-48/63747" },
  sqy40: { label: "Square Yards resident reviews, Sector 40 (12 reviews, Jun 2025)", url: "https://www.squareyards.com/reviews/locality/sector-40/63731" },
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
  "49": [{ src: "police2024", note: "Vatika Chowk", tone: "bad" }, { src: "sqy49", note: "Residents: many feel safe in gated societies with 24/7 security. Others mention dim or broken streetlights in some lanes and an older report of thefts.", tone: "info" }],
  "52": [{ src: "police2024", note: "Government Girls' College area", tone: "bad" }, { src: "sqy52", note: "Residents are mixed: some feel secure in gated communities, others feel unsafe after dark and mention dim roads, blind spots and little patrolling.", tone: "info" }],
  "22": [{ src: "police2024", note: "an area in the sector", tone: "bad" }],
  "29": [{ src: "police2024", note: "an area in the sector", tone: "bad" }],
  "48": [{ src: "police2024", note: "an area in the sector", tone: "bad" }, { src: "sqy48", note: "Only 11 reviews, mostly positive: well-lit streets, feeling safe at night, a police station nearby. Small sample.", tone: "info" }],
  "57": [{ src: "sqy57", note: "Residents are mixed: some feel safe in gated, well-lit lanes. Many report dim or broken streetlights, dark corners and little police patrolling at night.", tone: "info" }],
  "65": [{ src: "sqy65", note: "Residents are mixed: secure inside gated societies, but poor lighting on service lanes, dark stretches and weak patrolling are mentioned.", tone: "info" }],
  "67": [{ src: "sqy67", note: "Residents mostly feel safe inside gated societies. Some report missing streetlights on service roads and isolated spots after dark, including phone snatching.", tone: "info" }],
  "43": [{ src: "sqy43", note: "Residents are mixed: some feel secure with lit streets and patrols, others cite dark patches and missing streetlights in back lanes and interior roads.", tone: "info" }],
  "46": [{ src: "sqy46", note: "Residents are mixed: some call it safe with well-lit streets, others report missing streetlights on internal lanes, and a tenant mentions thefts.", tone: "info" }],
  "47": [{ src: "sqy47", note: "Residents are mixed: some find streets well lit, even for women at night. Others report dim lights, unsafe lanes and snatching incidents.", tone: "info" }],
  "40": [{ src: "sqy40", note: "Only 12 reviews, mostly positive: residents mention feeling secure after dark and 24-hour society security. Small sample.", tone: "info" }],
  "34": [{ src: "safetipinHubs", note: "Audited area scored 2.1 out of 5 for women's safety (0-1 poor, 1-3.4 average, above 3.4 good).", tone: "bad" }],
  "44": [{ src: "safetipinHubs", note: "Audited area scored 1.5 out of 5 for women's safety (0-1 poor, 1-3.4 average, above 3.4 good).", tone: "bad" }],
  "56": [{ src: "sqy56", note: "Residents are mixed: many call it secure with night patrols, others mention poorly lit back streets and blind spots.", tone: "info" }],
  "70": [{ src: "tribune70", note: "Two women returning to their PG near Tulip Chowk were followed by a man in an SUV (Oct 2026). The woman said lighting was poor and patrols were missing. No arrest was reported.", tone: "bad" }],
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
