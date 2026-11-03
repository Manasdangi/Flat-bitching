// Water-supply and flood risk by sector, compiled from public reporting (not official data).
// Sectors not listed have no reported problem in the sources checked: that is NOT a guarantee.
export type FloodLevel = "high" | "medium";

export const FLOOD_SOURCE = { label: "MoveToGurgaon", url: "https://www.movetogurgaon.com/gurgaon-waterlogging-monsoon-affected-areas/" };
export const WATER_SOURCE = { label: "Newslaundry (Jun 2026)", url: "https://www.newslaundry.com/2026/06/24/water-comes-once-in-3-days-gurugrams-forgotten-neighbourhoods" };

const OLD = "Ageing drains and recurring basement flooding reported.";
const BADSHAHPUR = "Near the Badshahpur drain basin, which floods in heavy rain.";
const GCE = "Poor drainage connectivity along Golf Course Extension Road.";
const DXP = "Drainage gaps linked to ongoing Dwarka Expressway construction.";

import { FLOOD_EV } from "./evidence";

const BASE_FLOOD: Record<string, { level: FloodLevel; note: string }> = {
  "12": { level: "high", note: OLD }, "14": { level: "high", note: OLD }, "15": { level: "high", note: OLD },
  "45": { level: "high", note: BADSHAHPUR }, "47": { level: "high", note: BADSHAHPUR }, "50": { level: "high", note: BADSHAHPUR },
  "56": { level: "medium", note: GCE }, "57": { level: "medium", note: GCE }, "58": { level: "medium", note: GCE },
  "palam-vihar": { level: "medium", note: "Named among areas that waterlog in heavy rain." },
  ...Object.fromEntries(["81", "82", "83", "84", "85", "86", "88a", "88b", "89", "90", "91", "92", "93", "95"].map((id) => [id, { level: "medium" as FloodLevel, note: DXP }])),
};

// Sectors named only in newer news reports get a medium level (single or few sources), never "high".
const FROM_NEWS: Record<string, { level: FloodLevel; note: string }> = Object.fromEntries(
  Object.entries(FLOOD_EV)
    .filter(([id, ev]) => !BASE_FLOOD[id] && ev.some((e) => e.tone === "bad"))
    .map(([id, ev]) => { const n = ev.filter((e) => e.tone === "bad").length; return [id, { level: "medium" as FloodLevel, note: `Named in ${n} news report${n > 1 ? "s" : ""} on monsoon flooding (2025–26).` }]; }),
);
export const FLOOD: Record<string, { level: FloodLevel; note: string }> = { ...FROM_NEWS, ...BASE_FLOOD };

// 1 = severe, 2 = regular shortages. Others default to 3 (no widespread shortage reported).
export const WATER: Record<string, { score: 1 | 2; note: string }> = {
  "56": { score: 1, note: "Sushant Lok 2 blocks report water once in ~4 days; tubewells run 15–16 hours and tankers are common." },
  "47": { score: 2, note: "Square Yards lists it with reported water pressure and supply issues (Apr 2026)." },
  "51": { score: 2, note: "Square Yards lists it with reported water pressure and supply issues (Apr 2026)." },
  "55": { score: 2, note: "A booster operator says only ~60 of 100 households get water in summer." },
  ...Object.fromEntries(["21", "22", "23", "54", "57", "59", "63", "63a", "70", "95"].map((id) => [id, { score: 2 as const, note: "Listed among tail-end areas with regular summer water shortages; tankers fill the gap." }])),
};

/** Drainage can't be better than the flood evidence: high risk caps at 2, medium at 3. */
export const drainFor = (id: string, editorial: number) => {
  const f = FLOOD[id];
  return f ? Math.min(editorial, f.level === "high" ? 2 : 3) : editorial;
};
export const waterScore = (id: string) => WATER[id]?.score ?? 3;
