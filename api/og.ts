// GET /api/og?r=43:87,25:85,41:80[&format=story] → PNG share card (1200×630 or 1080×1920).
// Node runtime: satori (layout → SVG) + resvg (SVG → PNG).
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { parseResult } from "../src/lib/share.js";
import { card } from "./_card.js";

type Font = { name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" };
let fonts: Promise<Font[]> | null = null;
const loadFonts = (origin: string) =>
  (fonts ??= Promise.all([
    fetch(`${origin}/fonts/inter-latin-400-normal.woff`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/inter-latin-800-normal.woff`).then((r) => r.arrayBuffer()),
  ]).then(([regular, bold]) => [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 800 as const, style: "normal" as const },
  ]));

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    const entries = parseResult(url.searchParams.get("r"));
    const story = url.searchParams.get("format") === "story";
    const [width, height] = story ? [1080, 1920] : [1200, 630];
    let list: Font[];
    try {
      list = await loadFonts(url.origin);
    } catch (e) {
      fonts = null;
      return new Response("font load failed", { status: 500 });
    }
    let png: Buffer;
    try {
      const svg = await satori(card(entries, story ? "story" : "og") as never, { width, height, fonts: list });
      png = new Resvg(svg).render().asPng();
    } catch (e) {
      console.error("og render failed:", (e as Error)?.message ?? String(e));
      return new Response("image render failed", { status: 500 });
    }
    return new Response(png, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
    });
  },
};
