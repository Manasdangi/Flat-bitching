import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./App.css";
import MapView from "./components/MapView";
import SearchBar from "./components/SearchBar";
import SectorPanel from "./components/SectorPanel";
import Matcher from "./components/Matcher";
import Compare from "./components/Compare";
import { DATA_UPDATED, SECTORS, SOURCES, sectorById } from "./data/sectors";
import { ZERO_WEIGHTS, type Office, type Weights } from "./lib/score";

type View = "explore" | "match" | "compare";

// Hash routes: #/sector/48, #/match, #/compare
function parseHash(): { view: View; id: string | null } {
  const [, a, b] = location.hash.split("/");
  if (a === "sector" && b && sectorById(b)) return { view: "explore", id: b };
  if (a === "match" || a === "compare") return { view: a, id: null };
  return { view: "explore", id: null };
}

function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? { ...init, ...JSON.parse(raw) } : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return [v, setV] as const;
}

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const [weights, setWeights] = usePersisted<Weights>("gff-weights", ZERO_WEIGHTS);
  const [prefs, setPrefs] = usePersisted<{ office: Office; budget: number; compare: string[] }>(
    "gff-prefs", { office: null, budget: 0, compare: [] },
  );
  const [pickingOffice, setPickingOffice] = useState(false);

  useEffect(() => {
    const on = () => setRoute(parseHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  const go = (hash: string) => { location.hash = hash; };
  const select = (id: string) => go(`/sector/${id}`);
  const setOffice = (office: Office) => setPrefs((p) => ({ ...p, office }));
  const setCompare = (compare: string[]) => setPrefs((p) => ({ ...p, compare }));

  const tab = route.id ? "explore" : route.view;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo">🏙️</span>
          <div>
            <h1>Gurgaon Flat Finder</h1>
            <p>Find the right sector for <i>your</i> priorities</p>
          </div>
        </div>
        <SearchBar onSelect={select} />
        <nav className="tabs">
          <button className={tab === "explore" ? "on" : ""} onClick={() => go("/")}>🗺️ Explore</button>
          <button className={tab === "match" ? "on" : ""} onClick={() => go("/match")}>🎯 Match</button>
          <button className={tab === "compare" ? "on" : ""} onClick={() => go("/compare")}>
            ⚖️ Compare{prefs.compare.length ? ` (${prefs.compare.length})` : ""}
          </button>
        </nav>
      </header>

      <main className="layout">
        <div className="map-wrap">
          <MapView
            selectedId={route.id}
            onSelect={select}
            weights={weights}
            office={prefs.office}
            pickingOffice={pickingOffice}
            onPickOffice={(lat, lng) => { setOffice({ name: "My office (pinned)", lat, lng }); setPickingOffice(false); }}
          />
          {pickingOffice && <div className="map-hint">Tap your office location on the map</div>}
          <div className="legend">
            <span><i style={{ background: "hsl(0 75% 45%)" }} />Low</span>
            <span><i style={{ background: "hsl(130 75% 45%)" }} />High match</span>
            <span><i className="dot" style={{ background: "#ca8a04" }} />Yellow</span>
            <span><i className="dot" style={{ background: "#0284c7" }} />Rapid</span>
          </div>
        </div>

        <aside className="panel">
          {route.id ? (
            <SectorPanel
              id={route.id}
              weights={weights}
              office={prefs.office}
              onClose={() => go("/")}
              inCompare={prefs.compare.includes(route.id)}
              onToggleCompare={() => {
                const id = route.id!;
                setCompare(prefs.compare.includes(id) ? prefs.compare.filter((x) => x !== id) : [...prefs.compare, id].slice(-3));
              }}
            />
          ) : route.view === "match" ? (
            <Matcher
              weights={weights} setWeights={setWeights}
              office={prefs.office} setOffice={setOffice}
              pickingOffice={pickingOffice} setPickingOffice={setPickingOffice}
              budget={prefs.budget} setBudget={(budget) => setPrefs((p) => ({ ...p, budget }))}
              onSelect={select}
            />
          ) : route.view === "compare" ? (
            <Compare ids={prefs.compare} setIds={setCompare} weights={weights} office={prefs.office} onSelect={select} />
          ) : (
            <div className="panel-body">
              <h2>Explore Gurgaon, sector by sector</h2>
              <p>Tap a sector on the map or search above to see rents, metro access, popular societies, PGs, and reviews from residents.</p>
              <p>Not sure where to start? Open <button className="link" onClick={() => go("/match")}>🎯 Match</button>, set what matters to you (clean society, women safety, metro, clean air, market), and the map lights up with your best sectors.</p>
              <h3>Browse by zone</h3>
              {Array.from(new Set(SECTORS.map((s) => s.zone))).map((z) => (
                <div key={z} className="zone">
                  <p className="eyebrow">{z}</p>
                  <div className="chips">
                    {SECTORS.filter((s) => s.zone === z).map((s) => (
                      <button key={s.id} className="chip" onClick={() => select(s.id)}>{s.name.replace(/\s*\(.*\)/, "")}</button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="note">Covers {SECTORS.length} sectors (updated {DATA_UPDATED}). Data is researched from public sources and approximate, and reviews come from real users.</p>
              <h3>Sources</h3>
              <ul className="sources">{SOURCES.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="noreferrer">{x.label}</a></li>)}</ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
