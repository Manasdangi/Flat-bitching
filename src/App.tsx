import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./App.css";
import MapView from "./components/MapView";
import SearchBar from "./components/SearchBar";
import SectorPanel from "./components/SectorPanel";
import Matcher from "./components/Matcher";
import Compare from "./components/Compare";
import SocietyPage, { SocietyList } from "./components/SocietyPage";
import { DATA_UPDATED, OFFICES, SECTORS, SOURCES, sectorById } from "./data/sectors";
import { useDriveTimes } from "./lib/geo";
import { linkProps, navigate, useRoute, type Route } from "./lib/router";
import { setActiveDrives, ZERO_WEIGHTS, type Office, type Weights } from "./lib/score";
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
  if (route.view === "compare") return { title: `Compare Gurgaon sectors | ${SITE}`, desc: "Compare Gurgaon sectors side by side: rent, metro, commute, hospitals and scores." };
  return { title: `${SITE}: choose the right sector in Gurgaon`, desc: `Map of ${SECTORS.length} Gurgaon sectors with rents, societies, PGs, metro, schools, tech hubs, live air quality and resident reviews.` };
}

type Sheet = "peek" | "half" | "full";

export default function App() {
  const route = useRoute();
  const [weights, setWeights] = usePersisted<Weights>("gff-weights", ZERO_WEIGHTS);
  const [prefs, setPrefs] = usePersisted<{ office: Office; budget: number; compare: string[] }>(
    "gff-prefs", { office: null, budget: 0, compare: [] },
  );
  const [pickingOffice, setPickingOffice] = useState(false);
  const [layers, setLayers] = usePersisted("gff-layers", { tech: true, hangout: true });
  const [sheet, setSheet] = useState<Sheet>("half");
  const panelRef = useRef<HTMLElement>(null);

  // Real drive times for the selected hub (custom pins fall back to estimates).
  const hubName = prefs.office && OFFICES.some((o) => o.name === prefs.office!.name) ? prefs.office.name : null;
  const drives = useDriveTimes(hubName);
  setActiveDrives(hubName, drives);

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
  const setCompare = (compare: string[]) => setPrefs((p) => ({ ...p, compare }));
  const selectedId = route.view === "sector" ? route.id : null;
  const tab = route.view === "sector" || route.view === "society" ? "explore" : route.view;

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
            <p>Find the right sector for <i>your</i> priorities</p>
          </div>
        </a>
        <SearchBar onSelect={select} />
        <nav className="tabs">
          <a className={tab === "explore" ? "on" : ""} {...linkProps("/")}>🗺️ Explore</a>
          <a className={tab === "match" ? "on" : ""} {...linkProps("/match")}>🎯 Match</a>
          <a className={tab === "compare" ? "on" : ""} {...linkProps("/compare")}>
            ⚖️ Compare{prefs.compare.length ? ` (${prefs.compare.length})` : ""}
          </a>
        </nav>
      </header>

      <main className={`layout sheet-${sheet}`}>
        <div className="map-wrap">
          <MapView
            selectedId={selectedId}
            onSelect={select}
            weights={weights}
            office={prefs.office}
            pickingOffice={pickingOffice}
            layers={layers}
            onPickOffice={(lat, lng) => { setOffice({ name: "My office (pinned)", lat, lng }); setPickingOffice(false); }}
          />
          {pickingOffice && <div className="map-hint">Tap your office location on the map</div>}
          <div className="legend">
            <span><i style={{ background: "hsl(0 75% 45%)" }} />Low</span>
            <span><i style={{ background: "hsl(130 75% 45%)" }} />High match</span>
            <span><i className="dot" style={{ background: "#ca8a04" }} />Yellow</span>
            <span><i className="dot" style={{ background: "#0284c7" }} />Rapid</span>
            <label><input type="checkbox" checked={layers.tech} onChange={(e) => setLayers((l) => ({ ...l, tech: e.target.checked }))} /><i className="dot" style={{ background: "#0f172a" }} />Tech hubs</label>
            <label><input type="checkbox" checked={layers.hangout} onChange={(e) => setLayers((l) => ({ ...l, hangout: e.target.checked }))} /><i className="dot" style={{ background: "#db2777" }} />Hangouts</label>
          </div>
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
              weights={weights} setWeights={(w) => { setWeights(w); }}
              office={prefs.office} setOffice={setOffice}
              pickingOffice={pickingOffice} setPickingOffice={(v) => { setPickingOffice(v); if (v) setSheet("peek"); }}
              budget={prefs.budget} setBudget={(budget) => setPrefs((p) => ({ ...p, budget }))}
              onSelect={select}
            />
          ) : route.view === "compare" ? (
            <Compare ids={prefs.compare} setIds={setCompare} weights={weights} office={prefs.office} onSelect={select} />
          ) : (
            <div className="panel-body">
              <h2>Explore Gurgaon, sector by sector</h2>
              <p>Tap a sector on the map or search above to see rents, metro access, societies, PGs, live air quality and resident reviews.</p>
              <p>Not sure where to start? Open <a className="link" {...linkProps("/match")}>🎯 Match</a>, set what matters to you, and the map lights up with your best sectors.</p>
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
              <p className="note">Covers {SECTORS.length} sectors (updated {DATA_UPDATED}). Sector outlines and drive times come from OpenStreetMap; other data is researched and approximate; reviews come from real users.</p>
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
