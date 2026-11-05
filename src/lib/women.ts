import { SECTORS, type Sector } from "../data/sectors";
import { nearby, nearestMetro } from "./score";
import { FLOOD, WATER } from "../data/risk";

const metroScore = (km: number) => (km <= 1 ? 5 : km <= 2 ? 4 : km <= 3.5 ? 3 : km <= 5 ? 2 : 1);
const mid = ([a, b]: [number, number]) => (a + b) / 2;

/** How easy and safe it is to get home after dark: safety first, then metro distance, then how active the area is. */
export function nightHome(s: Sector) {
  const km = nearestMetro(s).km;
  const m = metroScore(km);
  const score = 0.55 * s.scores.safety + 0.25 * m + 0.2 * s.scores.market;
  const label = score >= 4 ? "Easy and safer" : score >= 3 ? "Manageable" : "Plan carefully";
  const tips: string[] = [];
  if (km > 3.5) tips.push("Metro is far, so plan on a cab or auto for the last stretch");
  if (s.scores.market <= 2) tips.push("Few shops and eateries stay open late, so the streets can be empty");
  if (s.scores.safety <= 2) tips.push("Rated low for safety: prefer a flat on a main road in a gated society");
  if (!tips.length) tips.push("Still check the walk from the drop-off point to your gate at night");
  return { score: Math.round(score * 10) / 10, label, km, tips };
}

/** Overall "good for women" score, 0-100, used to rank sectors. */
export function womenScore(s: Sector) {
  const m = metroScore(nearestMetro(s).km);
  const v = 0.5 * s.scores.safety + 0.15 * s.scores.market + 0.1 * s.scores.clean + 0.1 * s.scores.drain + 0.15 * m;
  return Math.round(((v - 1) / 4) * 100);
}

/** Rough monthly cost of the three common ways to live, in ₹ thousand. Estimates from the sector's rent ranges. */
export function livingCosts(s: Sector) {
  const flat = mid(s.rent2bhk);
  const bills = 3; // electricity, internet, help, maintenance share
  return {
    pg: Math.round(mid(s.pgRent)),
    share2: Math.round(flat / 2 + bills),
    share3: Math.round(flat / 3 + bills),
  };
}

export type WomenFilters = { budget: number; pgOnly: boolean; metro: boolean; noFlood?: boolean; noWater?: boolean; lively?: boolean; safe4?: boolean };

export const rankedForWomen = (o: WomenFilters) =>
  SECTORS.filter((s) => (!o.budget || (o.pgOnly ? s.pgRent[0] : s.rent2bhk[0]) <= o.budget)
    && (!o.pgOnly || s.pg !== "Low")
    && (!o.metro || nearestMetro(s).km <= 2)
    && (!o.noFlood || !FLOOD[s.id])
    && (!o.noWater || !WATER[s.id])
    && (!o.lively || s.scores.market >= 4)
    && (!o.safe4 || s.scores.safety >= 4))
    .map((s) => ({ s, w: womenScore(s) }))
    .sort((a, b) => b.w - a.w);

/** Plain-text safety card for one sector, to send to family or a friend. */
export function areaCardText(s: Sector, url: string) {
  const n = nightHome(s), m = nearestMetro(s), h = nearby(s, "hospital", 1, 99)[0];
  return [
    `${s.name}, Gurgaon: area safety card`,
    `Women's score: ${womenScore(s)}/100 · Getting home after dark: ${n.label}`,
    `Nearest metro: ${m.station.name} (${m.km.toFixed(1)} km)`,
    h && `Nearest big hospital: ${h.name} (${h.km.toFixed(1)} km)`,
    FLOOD[s.id] && "Waterlogging reported in monsoon",
    WATER[s.id] && "Water shortages reported",
    "Emergency 112 · Women helpline 1091 / 181",
    url,
  ].filter(Boolean).join("\n");
}
