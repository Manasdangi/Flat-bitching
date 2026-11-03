import { SECTORS } from "../data/sectors";
import { matchScore, ZERO_WEIGHTS, type Weights } from "./score";

export const PRESETS: { label: string; short: string; w: Partial<Weights> }[] = [
  { label: "👩 Safe for women", short: "women safety", w: { safety: 5, transit: 3, market: 3, clean: 2 } },
  { label: "🚇 No car", short: "living without a car", w: { transit: 5, market: 4, commute: 3 } },
  { label: "👨‍👩‍👧 Family", short: "families", w: { safety: 4, green: 4, clean: 4, drain: 3, schools: 4, health: 3 } },
  { label: "💸 Budget", short: "tight budgets", w: { afford: 5, commute: 3, transit: 2 } },
  { label: "🌿 Clean air", short: "cleaner air", w: { air: 5, green: 4, clean: 3 } },
  { label: "🧑‍💻 Young techie", short: "young techies", w: { techhub: 5, nightlife: 4, transit: 3, afford: 2 } },
];

// "Best for" badges: a sector earns one if it ranks in the top 8 for a preset (no office assumed).
let cache: Map<string, string[]> | null = null;
export function badgesFor(sectorId: string): string[] {
  if (!cache) {
    cache = new Map();
    for (const p of PRESETS) {
      const w = { ...ZERO_WEIGHTS, ...p.w };
      SECTORS.map((s) => ({ id: s.id, m: matchScore(s, w, null) ?? 0 }))
        .sort((a, b) => b.m - a.m)
        .slice(0, 8)
        .forEach(({ id }) => cache!.set(id, [...(cache!.get(id) ?? []), p.label]));
    }
  }
  return cache.get(sectorId) ?? [];
}
