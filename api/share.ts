// GET /share?r=43:87,25:85 → tiny HTML page with rich preview tags for WhatsApp/LinkedIn/X,
// which then sends people to the result page in the app.
import { sectorById } from "../src/data/sectors";
import { encodeResult, parseResult } from "../src/lib/share";

export const config = { runtime: "edge" };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default function handler(req: Request) {
  const url = new URL(req.url);
  const entries = parseResult(url.searchParams.get("r"));
  const r = encodeURIComponent(encodeResult(entries));
  const top = entries[0] ? sectorById(entries[0].id) : undefined;
  const title = top
    ? `My best Gurgaon match: ${top.name.replace(/\s*\(.*\)/, "")} (${entries[0].match}%)`
    : "Find your best Gurgaon sector in 60 seconds";
  const desc = entries.length
    ? `My top sectors: ${entries.map((e) => `${sectorById(e.id)!.name.replace(/\s*\(.*\)/, "")} ${e.match}%`).join(", ")}. Take the 60-second quiz to find yours.`
    : "Answer 6 quick questions and get your top 3 Gurgaon sectors.";
  const image = `${url.origin}/api/og${entries.length ? `?r=${r}` : ""}`;
  const target = entries.length ? `/quiz/result?r=${r}&shared=1` : "/quiz";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Gurgaon Flat Finder">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(url.href)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<link rel="canonical" href="${esc(url.origin + target)}">
</head><body><p><a href="${esc(target)}">See the result</a></p>
<script>location.replace(${JSON.stringify(target)})</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
