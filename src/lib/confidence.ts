import { sectorById } from "../data/sectors";
import { FLOOD_EV, RENT_CHECK, SAFETY_EV, WATER_EV } from "../data/evidence";
import { COMMUNITY_MIN_VOTES, communityFor } from "./score";

export type Confidence = { level: "High" | "Medium" | "Low"; why: string };

/** How much real evidence stands behind a sector's numbers (not how good the sector is). */
export function confidence(id: string): Confidence {
  const s = sectorById(id);
  const votes = Math.max(0, ...Object.values(communityFor(id) ?? {}).map((c) => c?.n ?? 0));
  if (votes >= COMMUNITY_MIN_VOTES) return { level: "High", why: `Backed by ${votes} resident votes` };
  if (s?.summary.includes("limited data")) return { level: "Low", why: "Estimated from nearby sectors" };
  const sources = [SAFETY_EV[id], FLOOD_EV[id], WATER_EV[id], RENT_CHECK[id] ? [1] : undefined].filter(Boolean).length;
  if (sources >= 2) return { level: "Medium", why: "Some news reports and listings, no resident votes yet" };
  return { level: "Low", why: "Mostly editorial estimates, few public reports" };
}
