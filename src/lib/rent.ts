import type { Sector } from "../data/sectors";
import { RENT_CHECK_3BHK } from "../data/evidence";
import type { Bhk } from "./store";

export const BHK_TXT: Record<Bhk, string> = { "2bhk": "2 BHK", "3bhk": "3 BHK" };

/**
 * Rent range in ₹ thousand/month for the chosen home size. 2 BHK is the sector's own range. 3 BHK is estimated from it:
 * in the four sectors where we read 3 BHK listings (57, 65, 82, 84, Nov 2026) the typical 3 BHK ran about 1.4 to 1.5 times
 * the 2 BHK, so the low end is scaled by 1.45 and the high end by 1.4.
 */
export const rentRange = (s: Sector, bhk: Bhk): [number, number] =>
  bhk === "3bhk" ? [Math.round(s.rent2bhk[0] * 1.45), Math.round(s.rent2bhk[1] * 1.4)] : s.rent2bhk;

/** True when the shown range for this size is our estimate rather than read from listings. */
export const isEstimate = (bhk: Bhk) => bhk === "3bhk";

export const listingsFor3 = (sectorId: string) => RENT_CHECK_3BHK[sectorId];
