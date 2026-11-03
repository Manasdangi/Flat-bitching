// GET /api/og?r=43:87,25:85,41:80[&format=story] → PNG share card (1200×630 or 1080×1920).
import { ImageResponse } from "../node_modules/@vercel/og/dist/index.edge.js";
import { parseResult } from "../src/lib/share";
import { card } from "./_card";

export const config = { runtime: "edge" };

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }[]> | null = null;
const loadFonts = (origin: string) =>
  (fonts ??= Promise.all([
    fetch(`${origin}/fonts/inter-latin-400-normal.woff`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/inter-latin-800-normal.woff`).then((r) => r.arrayBuffer()),
  ]).then(([regular, bold]) => [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 800 as const, style: "normal" as const },
  ]));

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const entries = parseResult(url.searchParams.get("r"));
  const story = url.searchParams.get("format") === "story";
  const size = story ? { width: 1080, height: 1920 } : { width: 1200, height: 630 };
  let fontList: Awaited<ReturnType<typeof loadFonts>> | undefined;
  try {
    fontList = await loadFonts(url.origin);
  } catch {
    fonts = null; // fall back to the built-in font
  }
  return new ImageResponse(card(entries, story ? "story" : "og"), {
    ...size,
    fonts: fontList,
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
