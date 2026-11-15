import { useEffect, useRef, useState } from "react";
import { SECTORS } from "../data/sectors";
import { loadShapes } from "../lib/geo";
import "./City3D.css";

// Free vector tiles (OpenStreetMap data, building heights included). No API key needed.
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = { embedded?: boolean; focusId?: string | null; onSelect?: (id: string) => void; userPos?: { lat: number; lng: number } | null };

// Cyber Hub: the default view when we have no location or sector.
const CYBER_HUB: [number, number] = [77.0888, 28.4950];

/** The 3D city. Standalone at /3d, or embedded over the main map (`embedded`) so the map itself turns 3D in place. */
export default function City3D({ embedded = false, focusId = null, onSelect, userPos = null }: Props = {}) {
  const selectRef = useRef(onSelect); selectRef.current = onSelect;
  const ready = useRef(false);
  const posRef = useRef(userPos); posRef.current = userPos;
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [status, setStatus] = useState("Loading 3D Gurgaon…");

  useEffect(() => {
    if (!embedded) document.title = "Gurgaon 3D: explore every sector in 3D | Kahan Rahe";
    let dead = false;
    let map: import("maplibre-gl").Map | null = null;
    (async () => {
      const [ml, worker] = await Promise.all([
        import("maplibre-gl"),
        import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
        import("maplibre-gl/dist/maplibre-gl.css"),
      ]);
      ml.setWorkerUrl(worker.default);
      if (dead || !box.current) return;
      // Opened from the map with ?sector=ID: start over that sector and highlight it.
      const wanted = (embedded ? focusId ?? "" : new URLSearchParams(location.search).get("sector") ?? "").toLowerCase();
      const focus = SECTORS.find((x) => x.id === wanted);
      map = new ml.Map({
        container: box.current, style: STYLE, center: posRef.current ? [posRef.current.lng, posRef.current.lat] : focus ? [focus.lng, focus.lat] : CYBER_HUB, zoom: posRef.current ? 16.3 : focus ? 15.8 : 15.6, pitch: 64, bearing: -28,
        maxPitch: 85, minZoom: 10, maxZoom: 19, attributionControl: { compact: true },
      });
      mapRef.current = map; (window as unknown as { __c3d?: unknown }).__c3d = map;
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), embedded ? "bottom-left" : "bottom-right");
      map.on("error", (e) => { console.error("c3d", e.error?.message ?? e); setStatus(`Map problem: ${String(e.error?.message ?? "unknown").slice(0, 140)}`); });
      map.on("load", async () => {
        const m = map!;
        // Replace the style's own 3D buildings with height-coloured ones for every building we have.
        for (const l of m.getStyle().layers ?? []) if (l.type === "fill-extrusion") m.removeLayer(l.id);
        const src = Object.entries(m.getStyle().sources).find(([, s]) => (s as { type?: string }).type === "vector")?.[0] ?? "openmaptiles";
        m.addLayer({
          id: "bld3d", type: "fill-extrusion", source: src, "source-layer": "building", minzoom: 13,
          paint: {
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 9],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 9],
              0, "#d9d4cc", 20, "#cfc8bf", 45, "#b9c3cf", 90, "#98a9bd", 160, "#7b90ad"],
            "fill-extrusion-opacity": 0.95, "fill-extrusion-vertical-gradient": true,
          },
        });
        // Sector outlines.
        const shapes = await loadShapes();
        m.addSource("sector-shapes", { type: "geojson", data: { type: "FeatureCollection", features: shapes.map((s) => ({ type: "Feature", properties: { id: s.sector_id }, geometry: s.geojson })) } });
        m.addLayer({ id: "sector-fill", type: "fill", source: "sector-shapes", paint: { "fill-color": "#6366f1", "fill-opacity": 0.07 } }, "bld3d");
        m.addLayer({ id: "sector-line", type: "line", source: "sector-shapes", paint: { "line-color": "#4f46e5", "line-width": 1.6, "line-opacity": 0.85 } });
        m.addLayer({ id: "sector-focus", type: "line", source: "sector-shapes", filter: ["==", ["get", "id"], focus?.id ?? "__none__"], paint: { "line-color": "#f59e0b", "line-width": 4 } });
        // Sector labels.
        m.addSource("sector-pts", { type: "geojson", data: { type: "FeatureCollection", features: SECTORS.map((s) => ({ type: "Feature", properties: { id: s.id, name: s.name }, geometry: { type: "Point", coordinates: [s.lng, s.lat] } })) } });
        m.addLayer({
          id: "sector-label", type: "symbol", source: "sector-pts", minzoom: 11.5,
          layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 15], "text-allow-overlap": false, "text-padding": 3, "text-pitch-alignment": "viewport" },
          paint: { "text-color": "#1e1b4b", "text-halo-color": "#ffffff", "text-halo-width": 1.8 },
        });
        m.on("click", "sector-label", (e) => { const id = e.features?.[0]?.properties?.id; if (!id) return; if (selectRef.current) selectRef.current(id); else location.href = `/sector/${id}`; });
        m.on("mouseenter", "sector-label", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "sector-label", () => (m.getCanvas().style.cursor = ""));
        ready.current = true;
        window.dispatchEvent(new Event("c3d-ready"));
        setStatus("");
      });
    })();
    return () => { dead = true; map?.remove(); mapRef.current = null; };
  }, []);

  // Embedded: follow the sector picked on the main map.
  useEffect(() => {
    const m = mapRef.current; if (!embedded || !m || !ready.current) return;
    const f = SECTORS.find((x) => x.id === focusId);
    if (m.getLayer("sector-focus")) m.setFilter("sector-focus", ["==", ["get", "id"], f?.id ?? "__none__"]);
    if (f) m.flyTo({ center: [f.lng, f.lat], zoom: Math.max(m.getZoom(), 15.5), duration: 900 });
  }, [focusId, embedded]);

  // Embedded: show a blue dot where the user is and fly there once the location arrives.
  const dot = useRef<import("maplibre-gl").Marker | null>(null);
  useEffect(() => {
    if (!embedded || !userPos) return;
    let cancelled = false;
    const run = async () => {
      const m = mapRef.current; if (!m || !ready.current || cancelled) return;
      const ml = await import("maplibre-gl");
      dot.current?.remove();
      const el = document.createElement("div");
      el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.28)";
      dot.current = new ml.Marker({ element: el }).setLngLat([userPos.lng, userPos.lat]).addTo(m);
      m.flyTo({ center: [userPos.lng, userPos.lat], zoom: 16.3, duration: 1200 });
    };
    run(); addEventListener("c3d-ready", run);
    return () => { cancelled = true; removeEventListener("c3d-ready", run); dot.current?.remove(); };
  }, [userPos, embedded]);

  // WASD to move, Q/E to turn, R/F to tilt.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const m = mapRef.current; if (!m || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase(), step = 160;
      if (k === "w") m.panBy([0, -step]); else if (k === "s") m.panBy([0, step]);
      else if (k === "a") m.panBy([-step, 0]); else if (k === "d") m.panBy([step, 0]);
      else if (k === "q") m.easeTo({ bearing: m.getBearing() - 20, duration: 250 });
      else if (k === "e") m.easeTo({ bearing: m.getBearing() + 20, duration: 250 });
      else if (k === "r") m.easeTo({ pitch: Math.min(85, m.getPitch() + 8), duration: 250 });
      else if (k === "f") m.easeTo({ pitch: Math.max(0, m.getPitch() - 8), duration: 250 });
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, []);

  return (
    <div className={embedded ? "c3d c3d-embed" : "c3d"}>
      <div ref={box} className="c3d-map" />
      {!embedded && <a className="c3d-back" aria-label="Back to the map" href={new URLSearchParams(location.search).get("sector") ? `/sector/${new URLSearchParams(location.search).get("sector")}` : "/"}>←</a>}
      {status && <div className="c3d-status">{status}</div>}
    </div>
  );
}
