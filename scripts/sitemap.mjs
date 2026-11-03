// Generates public/sitemap.xml from the sector + society data (runs before every build).
import { readFileSync, writeFileSync } from "node:fs";

const SITE = "https://gurgaon-flat-finder.vercel.app";
const src = readFileSync(new URL("../src/data/sectors.ts", import.meta.url), "utf8");
const sectorBlocks = [...src.matchAll(/^  s\("([^"]+)",[\s\S]*?\n    \[([^\]]*)\], "(?:High|Medium|Low)"/gm)];
const GENERIC = /(plots|floors|housing|flats|PGs|Mostly|houses|launches|societies|hospital|mall|Builder|limited)/i;
const slugify = (n) => n.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const urls = new Set(["/", "/match", "/compare", "/quiz", "/rent-safety", "/women", "/data"]);
for (const [, id, socs] of sectorBlocks) {
  urls.add(`/sector/${id}`);
  for (const [, name] of socs.matchAll(/"([^"]+)"/g)) if (!GENERIC.test(name) && slugify(name)) urls.add(`/society/${slugify(name)}`);
}
const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls]
  .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
  .join("\n")}\n</urlset>\n`;
writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
console.log(`sitemap: ${urls.size} urls`);
