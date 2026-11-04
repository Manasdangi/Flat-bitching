import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./App.css";
import MapView from "./components/MapView";
import SearchBar from "./components/SearchBar";
import SectorPanel from "./components/SectorPanel";
import Matcher from "./components/Matcher";
import ThemeToggle from "./components/ThemeToggle";
import WomenGuide from "./components/WomenGuide";
import RentSafety from "./components/RentSafety";
import DataMethod from "./components/DataMethod";
import Ask from "./components/Ask";
import { Quiz, QuizResult } from "./components/Quiz";
import Compare from "./components/Compare";
import SocietyPage, { SocietyList } from "./components/SocietyPage";
import ShortlistPage from "./components/Shortlist";
import LatestReviews from "./components/LatestReviews";
import { shortlist, womenMode } from "./lib/store";
import { DATA_UPDATED, OFFICES, SECTORS, SOURCES, sectorById } from "./data/sectors";
import { useDriveTimes } from "./lib/geo";
import { communityEnabled, loadCommunityScores } from "./lib/community";
import { linkProps, navigate, useRoute, type Route } from "./lib/router";
import { PRESETS } from "./lib/presets";
import { setActiveDrives, setCommunity, setExtraOffices, ZERO_WEIGHTS, type Office, type Weights } from "./lib/score";
import { societyBySlug, SOCIETIES } from "./lib/societies";
import { track } from "./lib/track";

function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? { ...init, ...JSON.parse(raw) } : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return [v, setV] as const;
}

const SITE = "Gurgaon Flat Finder";
function seo(route: Route) {
  if (route.view === "sector") {
    const s = sectorById(route.id);
    if (s) return { title: `${s.name}, Gurgaon: rent, societies, reviews | ${SITE}`, desc: `${s.name} (${s.zone}): 2BHK ₹${s.rent2bhk[0]}–${s.rent2bhk[1]}k, PGs, metro, schools, hospitals, tech hubs and resident reviews. ${s.summary}` };
  }
  if (route.view === "society") {
    const soc = societyBySlug(route.slug);
    if (soc) return { title: `${soc.name} reviews, ${soc.sectors[0].name} Gurgaon | ${SITE}`, desc: `Resident reviews and ratings for ${soc.name} in ${soc.sectors.map((x) => x.name).join(", ")}, Gurgaon: cleanliness, safety, water, power and waterlogging.` };
  }
  if (route.view === "match") return { title: `Find your best Gurgaon sector | ${SITE}`, desc: "Set your priorities (women safety, metro, clean air, schools, commute, budget) and see which Gurgaon sectors match best." };
  if (route.view === "quiz" || route.view === "quizResult") return { title: `Find your best Gurgaon sector in 60 seconds | ${SITE}`, desc: "Answer 6 quick questions and get your top 3 Gurgaon sectors, with a shareable result card." };
  if (route.view === "ask") return { title: `Ask about Gurgaon sectors | ${SITE}`, desc: "Ask questions about Gurgaon sectors: safest areas for women, rent and PG prices, metro access and flood risk. Answers come from our sector data." };
  if (route.view === "women") return { title: `Women's guide to renting and PG safety in Gurgaon | ${SITE}`, desc: "Checklists for single working women and PG residents: judging an area at night, PG safety checks, questions to ask landlords and getting home safely." };
  if (route.view === "data") return { title: `How we get our data | ${SITE}`, desc: "Where the Gurgaon Flat Finder data comes from, what is an estimate, how resident votes are protected from spam, and its known limits." };
  if (route.view === "rentSafety") return { title: `Rent safely in Gurgaon: tenant checklist | ${SITE}`, desc: "Avoid deposit scams and bad agreements: what to check before paying, what Haryana law says, and what to put in your rent agreement." };
  if (route.view === "shortlist") return { title: `My shortlist | ${SITE}`, desc: "Your saved Gurgaon sectors and societies, with notes. Share the list with your partner or flatmates." };
  if (route.view === "compare") return { title: `Compare Gurgaon sectors | ${SITE}`, desc: "Compare Gurgaon sectors side by side: rent, metro, commute, hospitals and scores." };
  return { title: `${SITE}: choose the right sector in Gurgaon`, desc: `Map of ${SECTORS.length} Gurgaon sectors with rents, societies, PGs, metro, schools, tech hubs, live air quality and resident reviews.` };
}

type Sheet = "peek" | "half" | "full";

export default function App() {
  const route = useRoute();
  const [storedWeights, setWeights] = usePersisted<Weights>("gff-weights", womenMode.get() ? { ...ZERO_WEIGHTS, ...PRESETS[0].w } : ZERO_WEIGHTS);
  const [prefs, setPrefs] = usePersisted<{ office: Office; office2: Office; office3?: Office; budget: number; compare: string[] }>(
    "gff-prefs", { office: null, office2: null, office3: null, budget: 0, compare: [] },
  );
  const baseWeights = { ...ZERO_WEIGHTS, ...storedWeights };
  // With an office pinned but no priorities set, colour the map by commute so the best-placed sectors show up straight away.
  const weights = !Object.values(baseWeights).some(Boolean) && prefs.office ? { ...baseWeights, commute: 5 } : baseWeights;
  const [pickingOffice, setPickingOffice] = useState<0 | 1 | 2 | 3>(0);
  const saved = shortlist.use();
  const women = womenMode.use();
  const [layers, setLayers] = usePersisted("gff-layers", { tech: true, hangout: true, flood: false });
  const [sheet, setSheet] = useState<Sheet>("half");
  const [legendOpen, setLegendOpen] = useState(() => typeof window === "undefined" || window.innerWidth > 860);
  const panelRef = useRef<HTMLElement>(null);

  // Real drive times for the selected hub (custom pins fall back to estimates).
  const hubName = prefs.office && OFFICES.some((o) => o.name === prefs.office!.name) ? prefs.office.name : null;
  const drives = useDriveTimes(hubName);
  setActiveDrives(hubName, drives);
  const hub2Name = prefs.office2 && OFFICES.some((o) => o.name === prefs.office2!.name) ? prefs.office2.name : null;
  const drives2 = useDriveTimes(hub2Name);
  setActiveDrives(hub2Name, drives2);
  const [, setCommunityTick] = useState(0);
  useEffect(() => {
    if (!communityEnabled) return;
    loadCommunityScores().then((m) => { setCommunity(m); setCommunityTick((x) => x + 1); }).catch(() => {});
  }, []);
  const hub3Name = prefs.office3 && OFFICES.some((o) => o.name === prefs.office3!.name) ? prefs.office3.name : null;
  const drives3 = useDriveTimes(hub3Name);
  setActiveDrives(hub3Name, drives3);
  setExtraOffices(prefs.office ? [prefs.office2, prefs.office3 ?? null] : []);

  // Per-page title + description for search engines and link previews.
  useEffect(() => {
    const { title, desc } = seo(route);
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", location.origin + location.pathname);
    panelRef.current?.scrollTo?.({ top: 0 });
    if (route.view === "sector" || route.view === "society") setSheet((s) => (s === "peek" ? "half" : s));
  }, [route.view, route.view === "sector" ? route.id : route.view === "society" ? route.slug : ""]);

  const select = (id: string) => { navigate(`/sector/${id}`); track("sector_open", { sector: id }); };
  const setOffice = (office: Office) => setPrefs((p) => ({ ...p, office }));
  const setOffice2 = (office2: Office) => setPrefs((p) => ({ ...p, office2 }));
  const setOffice3 = (office3: Office) => setPrefs((p) => ({ ...p, office3 }));
  const setCompare = (compare: string[]) => setPrefs((p) => ({ ...p, compare }));
  const selectedId = route.view === "sector" ? route.id : null;
  const tab = route.view === "sector" || route.view === "society" || route.view === "rentSafety" || route.view === "women" || route.view === "data" ? "explore" : route.view === "quizResult" ? "quiz" : route.view;

  // Bottom-sheet drag on phones: swipe up/down on the handle.
  const touchY = useRef<number | null>(null);
  const order: Sheet[] = ["peek", "half", "full"];
  const step = (dir: 1 | -1) => setSheet((s) => order[Math.min(2, Math.max(0, order.indexOf(s) + dir))]);

  return (
    <div className="app">
      <header className="top">
        <a className="brand" {...linkProps("/")}>
          <span className="logo">🏙️</span>
          <div>
            <h1>Gurgaon Flat Finder</h1>
            <p>{women ? "Find a safe place to live in Gurgaon" : <>Find the right sector for <i>your</i> priorities</>}</p>
          </div>
        </a>
        <SearchBar onSelect={select} />
        <nav className="tabs" aria-label="Main">
          <a className={tab === "explore" ? "on" : ""} {...linkProps("/")}><i>🗺️</i><span>Explore</span></a>
          <a className={tab === "quiz" ? "on" : ""} {...linkProps("/quiz")}><i>⚡</i><span>Quiz</span></a>
          <a className={tab === "match" ? "on" : ""} {...linkProps("/match")}><i>🎯</i><span>Match</span></a>
          <a className={tab === "compare" ? "on" : ""} {...linkProps("/compare")}><i>⚖️</i><span>Compare{prefs.compare.length ? ` (${prefs.compare.length})` : ""}</span></a>
          <a className={tab === "ask" ? "on" : ""} {...linkProps("/ask")}><i>💬</i><span>Ask AI</span></a>
          <a className={tab === "shortlist" ? "on" : ""} {...linkProps("/shortlist")}><i>♥</i><span>Saved{saved.length ? ` (${saved.length})` : ""}</span></a>
        </nav>
        <ThemeToggle />
      </header>

      <main className={`layout sheet-${sheet}`}>
        <div className="map-wrap">
          <MapView
            selectedId={selectedId}
            onSelect={select}
            weights={weights}
            office={prefs.office}
            office2={prefs.office ? prefs.office2 : null}
            office3={prefs.office ? prefs.office3 ?? null : null}
            pickingOffice={pickingOffice > 0}
            layers={layers}
            onPickOffice={(lat, lng) => {
              if (pickingOffice === 3) setOffice3({ name: "Third office (pinned)", lat, lng });
              else if (pickingOffice === 2) setOffice2({ name: "Second office (pinned)", lat, lng });
              else setOffice({ name: "My office (pinned)", lat, lng });
              setPickingOffice(0);
            }}
          />
          {pickingOffice && <div className="map-hint">Tap your office location on the map</div>}
          <details className="legend" open={legendOpen} onToggle={(e) => setLegendOpen((e.target as HTMLDetailsElement).open)}>
            <summary>Map key</summary>
            <div className="legend-body">
            <span><i style={{ background: "hsl(0 75% 45%)" }} />Low</span>
            <span><i style={{ background: "hsl(130 75% 45%)" }} />High match</span>
            <span><i className="dot" style={{ background: "#ca8a04" }} />Yellow</span>
            <span><i className="dot" style={{ background: "#0284c7" }} />Rapid</span>
            <label><input type="checkbox" checked={layers.tech} onChange={(e) => setLayers((l) => ({ ...l, tech: e.target.checked }))} /><i className="dot" style={{ background: "#0f172a" }} />Tech hubs</label>
            <label><input type="checkbox" checked={layers.hangout} onChange={(e) => setLayers((l) => ({ ...l, hangout: e.target.checked }))} /><i className="dot" style={{ background: "#db2777" }} />Hangouts</label>
              <label><input type="checkbox" checked={Boolean(layers.flood)} onChange={(e) => setLayers((l) => ({ ...l, flood: e.target.checked }))} /><i className="dot" style={{ background: "#0ea5e9" }} />Flood-prone</label>
          </div>
          </details>
        </div>

        <aside className="panel" ref={panelRef}>
          <button
            className="sheet-handle"
            aria-label={sheet === "full" ? "Collapse panel" : "Expand panel"}
            onClick={() => setSheet((s) => (s === "full" ? "peek" : s === "peek" ? "half" : "full"))}
            onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => {
              if (touchY.current == null) return;
              const dy = e.changedTouches[0].clientY - touchY.current;
              touchY.current = null;
              if (Math.abs(dy) > 30) { e.preventDefault(); step(dy < 0 ? 1 : -1); }
            }}
          ><span /></button>

          {route.view === "sector" ? (
            <SectorPanel
              id={route.id}
              weights={weights}
              office={prefs.office}
              office2={prefs.office ? prefs.office2 : null}
              office3={prefs.office ? prefs.office3 ?? null : null}
              onClose={() => navigate("/")}
              inCompare={prefs.compare.includes(route.id)}
              onToggleCompare={() => {
                const id = route.id;
                setCompare(prefs.compare.includes(id) ? prefs.compare.filter((x) => x !== id) : [...prefs.compare, id].slice(-3));
              }}
            />
          ) : route.view === "society" ? (
            <SocietyPage slug={route.slug} onClose={() => navigate("/")} />
          ) : route.view === "match" ? (
            <Matcher
              weights={baseWeights} setWeights={(w) => { setWeights(w); }}
              office={prefs.office} setOffice={setOffice}
              office2={prefs.office2} setOffice2={setOffice2}
              office3={prefs.office3 ?? null} setOffice3={setOffice3}
              pickingOffice={pickingOffice} setPickingOffice={(v) => { setPickingOffice(v); if (v) setSheet("peek"); }}
              budget={prefs.budget} setBudget={(budget) => setPrefs((p) => ({ ...p, budget }))}
              onSelect={select}
            />
          ) : route.view === "quiz" ? (
            <Quiz onDone={(p) => { setWeights(p.weights); setOffice(p.office); setPrefs((x) => ({ ...x, budget: p.budget })); }} />
          ) : route.view === "quizResult" ? (
            <QuizResult params={new URLSearchParams(location.search)} weights={weights} office={prefs.office} budget={prefs.budget} onSelect={select} />
          ) : route.view === "women" ? (
            <WomenGuide />
          ) : route.view === "ask" ? (
            <Ask />
          ) : route.view === "data" ? (
            <DataMethod />
          ) : route.view === "rentSafety" ? (
            <RentSafety />
          ) : route.view === "shortlist" ? (
            <ShortlistPage weights={weights} office={prefs.office} compareIds={prefs.compare} setCompare={setCompare} />
          ) : route.view === "compare" ? (
            <Compare ids={prefs.compare} setIds={setCompare} weights={weights} office={prefs.office} onSelect={select} />
          ) : (
            <div className="panel-body">
              <h2>{women ? "Where will you feel safe in Gurgaon?" : "Where should you live in Gurgaon?"}</h2>
              <p className="muted">{women ? "Safety-first picks for single women and PG residents. Tap a sector, search above, or take the quiz." : "Tap a sector on the map, search above, or let us pick for you."}</p>
              <div className="actions-grid">
                <a className="action-card primary" {...linkProps("/quiz")}><b>{women ? "⚡ Find a safe sector for me" : "⚡ 60-second quiz"}</b><span>Answer 6 taps, get your top 3 sectors</span></a>
                {women && <a className="action-card women" {...linkProps("/women")}><b>👩 Women's guide</b><span>PG checklist, night safety, helplines</span></a>}
                <a className="action-card" {...linkProps("/match")}><b>🎯 Set priorities</b><span>Safety, metro, air, commute, budget</span></a>
                <button className="action-card" onClick={() => document.querySelector<HTMLButtonElement>(".locate-btn")?.click()}><b>📍 Where am I?</b><span>Find the sector you're standing in</span></button>
                <a className="action-card" {...linkProps("/rent-safety")}><b>🛡️ Rent safely</b><span>Scam checks, deposit and agreement tips</span></a>
                <a className="action-card" {...linkProps("/data")}><b>🔎 How we get our data</b><span>Sources, estimates and known limits</span></a>
                <a className="action-card" {...linkProps("/shortlist")}><b>♥ My shortlist</b><span>{saved.length ? `${saved.length} saved` : "Nothing saved yet"}</span></a>
              </div>
              <p className="muted small-txt mode-line">
                {women ? "👩 Women-first view is on: safety leads the map and quiz." : "Showing the general view."}{" "}
                <button className="link" onClick={() => { womenMode.set(!women); track("women_mode", { on: !women }); }}>{women ? "Show for everyone" : "Switch to women-first"}</button>
              </p>
              <LatestReviews />
              <h3>Browse by zone</h3>
              {Array.from(new Set(SECTORS.map((s) => s.zone))).map((z) => (
                <div key={z} className="zone">
                  <p className="eyebrow">{z}</p>
                  <div className="chips">
                    {SECTORS.filter((s) => s.zone === z).map((s) => (
                      <a key={s.id} className="chip link-chip" {...linkProps(`/sector/${s.id}`)}>{s.name.replace(/\s*\(.*\)/, "")}</a>
                    ))}
                  </div>
                </div>
              ))}
              <h3>Societies ({SOCIETIES.length})</h3>
              <details><summary>Show all societies</summary><SocietyList /></details>
              <p className="note">Covers {SECTORS.length} sectors (updated {DATA_UPDATED}). Sector outlines (some are approximate estimates) and drive times come from OpenStreetMap; other data is researched and approximate; reviews come from real users.</p>
              <h3>Sources</h3>
              <ul className="sources">
                {SOURCES.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="noreferrer">{x.label}</a></li>)}
                <li><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors (ODbL): sector outlines, routing</a></li>
                <li><a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo: live air quality</a></li>
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
