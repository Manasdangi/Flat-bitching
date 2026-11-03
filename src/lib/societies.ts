import { SECTORS, type Sector } from "../data/sectors";

// Entries like "Builder floors" or "New group housing" describe housing types, not named societies.
const GENERIC = /(plots|floors|housing|flats|PGs|Mostly|houses|launches|societies|hospital|mall|Builder|limited)/i;

export const slugify = (name: string) =>
  name.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type Society = { slug: string; name: string; sectors: Sector[] };

const map = new Map<string, Society>();
for (const s of SECTORS) {
  for (const name of s.societies) {
    if (GENERIC.test(name)) continue;
    const slug = slugify(name);
    if (!slug) continue;
    const e = map.get(slug) ?? { slug, name, sectors: [] };
    if (!e.sectors.includes(s)) e.sectors.push(s);
    map.set(slug, e);
  }
}

export const SOCIETIES = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
export const societyBySlug = (slug: string) => map.get(slug);
export const isNamedSociety = (name: string) => !GENERIC.test(name) && Boolean(slugify(name));
