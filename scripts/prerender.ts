// Post-build: writes crawlable static HTML for every sector/society/key page and a few data-driven guide pages.
// The React app still boots on top of the sector/society pages; guide pages are standalone static HTML.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { SECTORS, ZONES, METRO, DATA_UPDATED, type Sector } from "../src/data/sectors";
import { FLOOD, WATER } from "../src/data/risk";
import { SOCIETIES } from "../src/lib/societies";

const SITE = "https://www.kahanrahe.online";
const NAME = "Gurgaon Flat Finder";
const BRAND = "Kahan Rahe";
const HOME_TITLE = `${BRAND}: Gurgaon Flat Finder. Best sectors, rent, PG and safety map`;
const tpl = readFileSync("dist/index.html", "utf8");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const km = (aLat: number, aLng: number, bLat: number, bLng: number) => Math.hypot((aLat - bLat) * 111, (aLng - bLng) * 98);
const metroOf = (s: Sector) => METRO.map((m) => ({ m, d: km(s.lat, s.lng, m.lat, m.lng) })).sort((a, b) => a.d - b.d)[0];
const rent = ([a, b]: [number, number]) => `₹${a}k–₹${b}k`;
const link = (path: string, text: string) => `<a href="${path}">${esc(text)}</a>`;

type Page = { path: string; title: string; desc: string; body: string; ld?: object[]; standalone?: boolean; noindex?: boolean };

const CSS = `body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;color:#1b1b2f;background:#fff}
@media(prefers-color-scheme:dark){body{background:#12121c;color:#e8e8f2}a{color:#a5a8ff}th,td{border-color:#33334a}}
main{max-width:760px;margin:0 auto;padding:20px 16px 60px}h1{line-height:1.25}a{color:#4338ca}
table{border-collapse:collapse;width:100%;font-size:15px}th,td{border-bottom:1px solid #e2e2ee;padding:8px 6px;text-align:left}
.cta{display:inline-block;background:#4338ca;color:#fff!important;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600}
.note{font-size:14px;opacity:.8}`;

function sectorPage(s: Sector): Page {
  const mt = metroOf(s), f = FLOOD[s.id], w = WATER[s.id];
  const near = SECTORS.filter((x) => x.id !== s.id).map((x) => ({ x, d: km(s.lat, s.lng, x.lat, x.lng) })).sort((a, b) => a.d - b.d).slice(0, 5);
  const title = `${s.name}, Gurgaon: rent, PG, safety and reviews | ${BRAND}`;
  const desc = `${s.name} (${s.zone}): 2BHK ${rent(s.rent2bhk)}, PG ${rent(s.pgRent)}, nearest metro ${mt.m.name} (${mt.d.toFixed(1)} km), flood and water notes, societies and resident reviews. ${s.summary}`.slice(0, 300);
  const body = `<main><nav aria-label="Breadcrumb">${link("/", "Gurgaon sectors")} › ${esc(s.zone)}</nav>
<h1>${esc(s.name)}, Gurgaon</h1><p>${esc(s.summary)}</p>
<ul><li>2 BHK rent: ${rent(s.rent2bhk)} per month (rough range)</li><li>PG (single occupancy): ${rent(s.pgRent)} per month, availability ${esc(s.pg)}</li>
<li>Nearest metro: ${esc(mt.m.name)}, about ${mt.d.toFixed(1)} km straight-line</li><li>Women safety score: ${s.scores.safety}/5 (editorial estimate)</li></ul>
<h2>Good</h2><ul>${s.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
<h2>Watch out</h2><ul>${s.watchOut.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
<h2>Water and flooding</h2><p>${f ? `Waterlogging risk (${f.level}): ${esc(f.note)} ` : ""}${w ? `Water: ${esc(w.note)}` : ""}${!f && !w ? "No water or flooding problems reported in the sources we checked. Ask current residents." : ""}</p>
<h2>Societies</h2><ul>${s.societies.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<h2>Nearby sectors</h2><ul>${near.map(({ x, d }) => `<li>${link(`/sector/${x.id}`, x.name)} (${d.toFixed(1)} km)</li>`).join("")}</ul>
<h2>More guides</h2><ul><li>${link("/guides/best-sectors-gurgaon-single-women", "Best sectors in Gurgaon for single working women")}</li><li>${link("/guides/pg-rent-gurgaon-by-sector", "PG rent in Gurgaon by sector")}</li><li>${link("/guides/gurgaon-sectors-near-metro", "Gurgaon sectors near a metro station")}</li></ul>
<p class="note">Rents are rough ranges from 2025–26 listings and scores are editorial estimates, updated ${DATA_UPDATED}. ${link("/data", "How we get our data")}.</p></main>`;
  const ld = [
    faq([
      [`What is the rent for a 2 BHK in ${s.name}, Gurgaon?`, `Roughly ${rent(s.rent2bhk)} per month based on 2025–26 listings. It varies by society, floor and furnishing.`],
      [`How much is a PG in ${s.name}, Gurgaon?`, `Single-occupancy PGs are roughly ${rent(s.pgRent)} per month, and PG availability here is ${s.pg.toLowerCase()}.`],
      [`Which metro station is nearest to ${s.name}?`, `${mt.m.name}, about ${mt.d.toFixed(1)} km in a straight line from the sector centre. The actual walk or ride is longer.`],
    ]),
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: NAME, item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: s.name, item: `${SITE}/sector/${s.id}` }] },
    { "@context": "https://schema.org", "@type": "Place", name: `${s.name}, Gurgaon`, description: s.summary,
      geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng }, address: { "@type": "PostalAddress", addressLocality: "Gurugram", addressRegion: "Haryana", addressCountry: "IN" } },
  ];
  return { path: `/sector/${s.id}`, title, desc, body, ld };
}

const faq = (qa: [string, string][]) => ({ "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

const pages: Page[] = [];
for (const s of SECTORS) pages.push(sectorPage(s));
for (const soc of SOCIETIES) {
  pages.push({
    path: `/society/${soc.slug}`,
    title: `${soc.name}, ${soc.sectors[0].name} Gurgaon: reviews and rent | ${BRAND}`,
    desc: `Resident reviews and ratings for ${soc.name} in ${soc.sectors.map((x) => x.name).join(", ")}, Gurgaon: cleanliness, safety, water, power and waterlogging.`,
    body: `<main><h1>${esc(soc.name)}, Gurgaon</h1><p>Located in ${soc.sectors.map((x) => link(`/sector/${x.id}`, x.name)).join(", ")}.</p>
<p>Typical 2 BHK rent in the sector: ${soc.sectors.map((x) => `${esc(x.name)} ${rent(x.rent2bhk)}`).join("; ")}.</p>
<p class="note">Resident reviews load in the app. ${link("/data", "How we get our data")}.</p></main>`,
  });
}


// Static app pages (match, quiz, ask...): give crawlers their own title, description, canonical and text instead of the home page's.
const appPage = (path: string, title: string, desc: string, h1: string, text: string, extra = "", noindex = false): Page => ({
  path, title: `${title} | ${BRAND}`, desc, noindex,
  body: `<main><nav>${link("/", NAME)}</nav><h1>${esc(h1)}</h1><p>${esc(text)}</p>${extra}<p><a class="cta" href="/">Open the map</a></p></main>`,
  ld: [{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: BRAND, item: SITE + "/" },
    { "@type": "ListItem", position: 2, name: h1, item: SITE + path }] }],
});
pages.push(
  appPage("/3d", "Gurgaon in 3D: explore every sector", "Fly around Gurgaon in 3D: every building, sector outlines and labels, with sunrise, golden hour and night views.", "Gurgaon in 3D", "Fly over Gurgaon in an interactive 3D map built from OpenStreetMap buildings. Jump to Cyber Hub, Golf Course Road, Old Gurgaon or Dwarka Expressway and tap any sector to see rent, safety and metro details."),
  appPage("/match", "Find your best Gurgaon sector", "Set your priorities (women safety, metro, clean air, schools, commute, budget) and see which Gurgaon sectors match best.", "Find your best Gurgaon sector", "Pick your office, budget and what matters most. We rank all Gurgaon sectors by how well they fit, with real drive times to your office, rent and the reasons behind each match."),
  appPage("/quiz", "Find your best Gurgaon sector in 60 seconds", "Answer 6 quick questions and get your top 3 Gurgaon sectors, with a shareable result card.", "Which Gurgaon sector suits you? 60-second quiz", "Six quick questions about budget, commute, safety and lifestyle give you a top 3 of Gurgaon sectors to look at first."),
  appPage("/ask", "Ask about Gurgaon sectors", "Ask questions about Gurgaon sectors: safest areas for women, rent and PG prices, metro access and flood risk. Answers come from our sector data.", "Ask about Gurgaon sectors", "Ask in plain words, for example the cheapest sector for a 2 BHK with low flood risk, or a safe PG area near Cyber City. Answers use only this site's sector data."),
  appPage("/women", "Women's guide to renting and PG safety in Gurgaon", "Checklists for single working women and PG residents: judging an area at night, PG safety checks, questions to ask landlords and getting home safely.", "Women's guide to renting and PG safety in Gurgaon", "Checklists for single working women and PG residents: how to judge an area at night, what to check in a PG, what to ask the landlord and how to plan getting home.", `<p>${link("/women/best", "Best Gurgaon sectors for women")} · ${link("/guides/best-sectors-gurgaon-single-women", "Guide: best sectors for single working women")}</p>`),
  appPage("/women/best", "Best Gurgaon sectors for women: safety, PG and metro", "Gurgaon sectors ranked by women's safety score, with PG availability, getting-home-at-night rating and metro access.", "Best Gurgaon sectors for women", "Sectors ranked by our women's score, which combines street activity at night, PG supply, metro access and getting home late.", `<p>${link("/guides/best-sectors-gurgaon-single-women", "Read the guide")}</p>`),
  appPage("/rent-safety", "Rent safely in Gurgaon: tenant checklist", "Avoid deposit scams and bad agreements: what to check before paying, what Haryana law says, and what to put in your rent agreement.", "Rent safely in Gurgaon: tenant checklist", "What to check before paying a token or deposit, how to verify the owner, and what to put in your rent agreement."),
  appPage("/data", "How we get our data", "Where the Gurgaon Flat Finder data comes from, what is an estimate, how resident votes are protected from spam, and its known limits.", "How we get our data", "Sector outlines and drive times come from OpenStreetMap. Rents are rough ranges from 2025-26 listings, nearby places are straight-line distances, and scores are editorial estimates until enough residents rate them."),
  appPage("/shortlist", "My shortlist", "Your saved Gurgaon sectors and societies, with notes.", "My shortlist", "Your saved sectors and societies live on your device.", "", true),
  appPage("/compare", "Compare Gurgaon sectors", "Compare Gurgaon sectors side by side: rent, metro, commute, hospitals and scores.", "Compare Gurgaon sectors", "Compare up to three sectors side by side on rent, metro, commute and scores.", "", true),
);

// Home: crawlable index of every sector, grouped by zone, plus guides.
const GUIDES: { slug: string; title: string; desc: string; build: () => string }[] = [];
const rows = (list: Sector[], cols: (s: Sector) => string[], heads: string[]) =>
  `<table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${list.map((s) => `<tr><td>${link(`/sector/${s.id}`, s.name)}</td>${cols(s).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const stamp = `<p class="note">Rents are rough ranges from 2025–26 listings and scores are editorial estimates, updated ${DATA_UPDATED}. See ${link("/data", "how we get our data")}. Visit at night and in monsoon before you rent.</p>`;

GUIDES.push({
  slug: "best-sectors-gurgaon-single-women",
  title: "Best sectors in Gurgaon for single working women (2026)",
  desc: "Sectors ranked by our women-safety score with PG availability, rent and metro distance. Built from sector data, resident polls and public reports.",
  build: () => {
    const top = [...SECTORS].filter((s) => s.pg !== "Low").sort((a, b) => b.scores.safety - a.scores.safety || a.pgRent[0] - b.pgRent[0]).slice(0, 15);
    return `<p>Single working women usually weigh four things: lit, active streets at night, a metro or easy cab access, PGs or landlords that accept singles, and a commute that does not end after dark. These sectors score highest on our safety rating and have at least a medium PG scene.</p>
${rows(top, (s) => [`${s.scores.safety}/5`, rent(s.pgRent), s.pg, `${metroOf(s).d.toFixed(1)} km`], ["Sector", "Safety", "PG rent", "PG supply", "Metro"])}
<h2>How to use this</h2><ul><li>Treat scores as a starting point: they are editorial until enough residents vote.</li><li>Check the street at 9–10pm and ask current residents about late cabs and gate security.</li><li>Use the ${link("/women", "women's checklist")} before paying a deposit.</li></ul>${stamp}`;
  },
});
GUIDES.push({
  slug: "waterlogging-prone-sectors-gurgaon",
  title: "Waterlogging-prone sectors in Gurgaon: where to be careful in monsoon",
  desc: "Gurgaon sectors with reported waterlogging, from news and civic reports, and what to check before renting on the ground floor or basement.",
  build: () => {
    const hit = SECTORS.filter((s) => FLOOD[s.id]).sort((a, b) => Number(FLOOD[b.id].level === "high") - Number(FLOOD[a.id].level === "high"));
    return `<p>Parts of Gurgaon flood in heavy rain. This list comes from news and civic reports, not official flood maps, and flooding is often limited to specific roads or low points inside a sector.</p>
${rows(hit, (s) => [FLOOD[s.id].level, FLOOD[s.id].note], ["Sector", "Risk", "Reported"])}
<h2>Before you sign</h2><ul><li>Avoid basements and ground floors in listed areas, and ask about a stilt or sump pump.</li><li>Ask neighbours where water stood last monsoon, and how the approach road behaves.</li></ul>${stamp}`;
  },
});
GUIDES.push({
  slug: "cheapest-sectors-gurgaon-2bhk-rent",
  title: "Cheapest sectors in Gurgaon for a 2 BHK rent (2026)",
  desc: "Gurgaon sectors with the lowest 2 BHK rent ranges, with metro distance and PG rents.",
  build: () => {
    const l = [...SECTORS].sort((a, b) => a.rent2bhk[0] + a.rent2bhk[1] - (b.rent2bhk[0] + b.rent2bhk[1])).slice(0, 20);
    return `<p>Lower rent usually means a longer commute, older stock or fewer amenities. Ranges are rough and vary by society and floor.</p>
${rows(l, (s) => [rent(s.rent2bhk), rent(s.pgRent), `${metroOf(s).d.toFixed(1)} km`], ["Sector", "2 BHK rent", "PG rent", "Metro"])}${stamp}`;
  },
});
GUIDES.push({
  slug: "pg-rent-gurgaon-by-sector",
  title: "PG rent in Gurgaon by sector (single occupancy, 2026)",
  desc: "Typical PG rent for a single room across Gurgaon sectors, with how easy PGs are to find in each.",
  build: () => {
    const l = SECTORS.filter((s) => s.pg !== "Low").sort((a, b) => a.pgRent[0] - b.pgRent[0]);
    return `<p>Single-occupancy PG rents by sector. Sharing rooms cost less. Meals, power and security rules vary a lot, so ask what is included.</p>
${rows(l, (s) => [rent(s.pgRent), s.pg, rent(s.rent2bhk)], ["Sector", "PG (single)", "PG supply", "2 BHK"])}${stamp}`;
  },
});
GUIDES.push({
  slug: "gurgaon-sectors-near-metro",
  title: "Gurgaon sectors within walking distance of a metro station",
  desc: "Gurgaon sectors within about 1.5 km of a Yellow Line or Rapid Metro station, with rent ranges.",
  build: () => {
    const l = SECTORS.map((s) => ({ s, mt: metroOf(s) })).filter((x) => x.mt.d <= 1.5).sort((a, b) => a.mt.d - b.mt.d);
    return `<p>Distances are straight-line from the sector centre, so the real walk is longer. Check the last train time if you travel late.</p>
${rows(l.map((x) => x.s), (s) => [`${metroOf(s).m.name}`, `${metroOf(s).d.toFixed(1)} km`, rent(s.rent2bhk)], ["Sector", "Station", "Distance", "2 BHK"])}${stamp}`;
  },
});
GUIDES.push({
  slug: "gurgaon-2bhk-rent-under-30000",
  title: "Gurgaon sectors where a 2 BHK costs under ₹30,000 a month (2026)",
  desc: "Gurgaon sectors where the whole 2 BHK rent range is under ₹30k, PG rent and metro distance for each.",
  build: () => {
    const l = SECTORS.filter((s) => s.rent2bhk[1] <= 30).sort((a, b) => a.rent2bhk[0] + a.rent2bhk[1] - (b.rent2bhk[0] + b.rent2bhk[1]));
    return `<p>In these sectors even the top of our 2 BHK range is ₹30k or less. Newer or better-maintained societies sit at the high end, so check real listings in the society you like.</p>
${rows(l, (s) => [rent(s.rent2bhk), rent(s.pgRent), `${metroOf(s).d.toFixed(1)} km`, `${s.scores.safety}/5`], ["Sector", "2 BHK rent", "PG rent", "Metro", "Safety"])}${stamp}`;
  },
});
GUIDES.push({
  slug: "gurgaon-sectors-better-air-green",
  title: "Gurgaon sectors with better air and more green space (2026)",
  desc: "Gurgaon sectors ranked by our air-quality and green-cover scores, with rent and metro distance.",
  build: () => {
    const l = [...SECTORS].sort((a, b) => (b.scores.air + b.scores.green) - (a.scores.air + a.scores.green) || a.rent2bhk[0] - b.rent2bhk[0]).slice(0, 15);
    return `<p>Gurgaon air is poor in winter everywhere, so these scores show relative differences (traffic, construction dust, parks nearby), not clean air. Use a purifier whichever sector you pick.</p>
${rows(l, (s) => [`${s.scores.air}/5`, `${s.scores.green}/5`, rent(s.rent2bhk), `${metroOf(s).d.toFixed(1)} km`], ["Sector", "Air", "Green", "2 BHK", "Metro"])}${stamp}`;
  },
});
GUIDES.push({
  slug: "gurgaon-sectors-by-zone",
  title: "Gurgaon sectors by zone: Golf Course Road, Sohna Road, Dwarka Expressway and more",
  desc: "How Gurgaon's main zones differ on rent, PG supply, safety and metro access, with every sector listed.",
  build: () => ZONES.map((z) => {
    const l = SECTORS.filter((s) => s.zone === z);
    const avg = (f: (s: Sector) => number) => Math.round(l.reduce((t, s) => t + f(s), 0) / l.length);
    return `<h2>${esc(z)}</h2><p>${l.length} sectors. Typical 2 BHK about ₹${avg((s) => (s.rent2bhk[0] + s.rent2bhk[1]) / 2)}k per month, single PG about ₹${avg((s) => (s.pgRent[0] + s.pgRent[1]) / 2)}k, average safety score ${(l.reduce((t, s) => t + s.scores.safety, 0) / l.length).toFixed(1)}/5.</p><p>${l.map((s) => link(`/sector/${s.id}`, s.name)).join(" · ")}</p>`;
  }).join("") + stamp,
});
for (const g of GUIDES) pages.push({
  path: `/guides/${g.slug}`, title: `${g.title} | ${BRAND}`, desc: g.desc, standalone: true,
  body: `<main><nav>${link("/", NAME)} › ${link("/guides", "Guides")}</nav><h1>${esc(g.title)}</h1>${g.build()}<h2>More guides</h2><ul>${GUIDES.filter((x) => x.slug !== g.slug).map((x) => `<li>${link(`/guides/${x.slug}`, x.title)}</li>`).join("")}</ul><p><a class="cta" href="/">Open the map</a></p></main>`,
  ld: [
    { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.desc, dateModified: DATA_UPDATED, mainEntityOfPage: `${SITE}/guides/${g.slug}`,
      image: `${SITE}/og.png`, author: { "@type": "Organization", name: BRAND, url: SITE + "/" }, publisher: { "@type": "Organization", name: BRAND, url: SITE + "/" } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: BRAND, item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Guides", item: SITE + "/guides" },
      { "@type": "ListItem", position: 3, name: g.title, item: `${SITE}/guides/${g.slug}` }] },
  ],
});
pages.push({ path: "/guides", title: `Gurgaon renting guides: rent, PG, safety, metro | ${BRAND}`, desc: "Data-driven guides to renting in Gurgaon: safest sectors for women, PG rents, waterlogging, metro access and budget.", standalone: true,
  body: `<main><h1>Gurgaon renting guides</h1><ul>${GUIDES.map((g) => `<li>${link(`/guides/${g.slug}`, g.title)}</li>`).join("")}</ul><p><a class="cta" href="/">Open the map</a></p></main>` });

const home = `<main><h1>${BRAND}: find where to live in Gurgaon</h1><p>${BRAND} (${NAME}) maps ${SECTORS.length} Gurgaon sectors with rent, PG prices, women-safety scores, flood risk, metro distance, societies and resident reviews.</p>
<h2>Guides</h2><ul>${GUIDES.map((g) => `<li>${link(`/guides/${g.slug}`, g.title)}</li>`).join("")}</ul>
${ZONES.map((z) => `<h2>${esc(z)}</h2><ul>${SECTORS.filter((s) => s.zone === z).map((s) => `<li>${link(`/sector/${s.id}`, s.name)}</li>`).join("")}</ul>`).join("")}</main>`;

function render(p: Page | null): string {
  let html = tpl;
  const title = p?.title ?? HOME_TITLE;
  const desc = p?.desc ?? `Kahan Rahe (kahanrahe.online) maps ${SECTORS.length} Gurgaon sectors with rent, PG prices, women-safety scores, flood risk, metro distance and resident reviews. Find where to live in Gurgaon.`;
  const url = SITE + (p?.path ?? "/");
  const body = p?.body ?? home;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(desc)}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(desc)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${esc(desc)}"`);
  if (p?.noindex) html = html.replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex,follow"');
  const ld = (p?.ld ?? [{ "@context": "https://schema.org", "@type": "WebSite", name: BRAND, alternateName: [NAME, "kahanrahe", "Kahan Rahe Gurgaon"], url: SITE + "/", inLanguage: "en-IN" },
    { "@context": "https://schema.org", "@type": "Organization", name: BRAND, url: SITE + "/", logo: SITE + "/apple-touch-icon.png" },
    ...(p ? [] : [faq([
      ["What is Kahan Rahe?", `Kahan Rahe (kahanrahe.online) is a free Gurgaon Flat Finder: a map of ${SECTORS.length} Gurgaon sectors with rent, PG prices, women-safety scores, flood risk, metro distance, societies and resident reviews.`],
      ["Which is the cheapest sector in Gurgaon for a 2 BHK?", "See the live ranking in our guide to the cheapest Gurgaon sectors for a 2 BHK. Lower rent usually means a longer commute or older stock."],
      ["Which Gurgaon sectors are best for single women?", "Our women's score ranks sectors on night-time street activity, PG supply, metro access and getting home late. See the guide for the top picks."],
      ["Is the rent data exact?", "No. Rents are rough ranges from 2025-26 listings. Check real listings and visit at night and in monsoon before you rent."],
    ])])]).map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("");
  if (p?.standalone) {
    html = html.replace(/<script type="module"[\s\S]*?<\/script>/g, "").replace(/<link rel="(modulepreload|stylesheet)"[^>]*>/g, "")
      .replace("</head>", `<style>${CSS}</style>${ld}</head>`).replace(/<div id="root"><\/div>/, body).replace(/<noscript>[\s\S]*?<\/noscript>/, "");
  } else {
    // App pages: crawlers get the full content, but people get a branded splash (not an unstyled page) until React mounts and replaces #root.
    const BOOT = `<style>.boot{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#fff;color:#1e1b4b;font:600 18px/1.3 system-ui,sans-serif}.boot i{width:28px;height:28px;border:3px solid #c7d2fe;border-top-color:#4f46e5;border-radius:50%;animation:bs .8s linear infinite}@keyframes bs{to{transform:rotate(360deg)}}.seo{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .boot{background:#0f1020;color:#e0e7ff}}:root[data-theme=dark] .boot{background:#0f1020;color:#e0e7ff}</style>`;
    html = html.replace("</head>", `${ld}${BOOT}</head>`).replace(/<div id="root"><\/div>/, `<div id="root"><div class="boot"><i></i>Gurgaon Flat Finder</div><div class="seo">${body}</div></div>`);
  }
  return html;
}

function write(path: string, html: string) {
  const dir = path === "/" ? "dist" : `dist${path}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html);
}
write("/", render(null));
for (const p of pages) write(p.path, render(p));
console.log(`prerender: ${pages.length + 1} pages (${GUIDES.length} guides)`);
