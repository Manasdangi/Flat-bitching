// Quiz results travel in URLs as r=43:87,25:85,41:80 (sector id : match %).
// Used by the app and by the /api/og + /api/share edge functions.
import { sectorById } from "../data/sectors";

export type ResultEntry = { id: string; match: number };

export function encodeResult(entries: ResultEntry[]) {
  return entries.slice(0, 3).map((e) => `${e.id}:${Math.round(e.match)}`).join(",");
}

export function parseResult(r: string | null | undefined): ResultEntry[] {
  if (!r) return [];
  return r
    .split(",")
    .slice(0, 3)
    .map((part) => {
      const [id, m] = part.split(":");
      const match = Math.max(0, Math.min(100, parseInt(m, 10)));
      return { id: (id ?? "").toLowerCase(), match };
    })
    .filter((e) => /^[a-z0-9-]{1,20}$/.test(e.id) && sectorById(e.id) && Number.isFinite(e.match));
}

export const SITE_URL = "https://gurgaon-flat-finder.vercel.app";
export const shareLink = (entries: ResultEntry[]) => `${SITE_URL}/share?r=${encodeURIComponent(encodeResult(entries))}`;
export const cardUrl = (entries: ResultEntry[], format: "og" | "story" = "og", origin = SITE_URL) =>
  `${origin}/api/og?r=${encodeURIComponent(encodeResult(entries))}${format === "story" ? "&format=story" : ""}`;
