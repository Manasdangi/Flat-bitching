import { useEffect, useRef, useState } from "react";
import { SECTORS } from "../data/sectors";
import { loadShapes } from "../lib/geo";
import "./City3D.css";

// Free vector tiles (OpenStreetMap data, building heights included). No API key needed.
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

const PLACES: [string, number, number][] = [
  ["Cyber Hub", 77.0892, 28.4963],
  ["Golf Course Rd", 77.1010, 28.4410],
  ["Galleria", 77.0820, 28.4673],
  ["Huda City Centre", 77.0723, 28.4594],
  ["Medanta", 77.0420, 28.4395],
  ["Sector 56", 77.1050, 28.4240],
  ["Dwarka Expwy", 76.9790, 28.4800],
  ["Old Gurgaon", 77.0230, 28.4640],
];

type Time = "sunrise" | "midday" | "golden" | "night";
const LIGHT: Record<Time, { pos: [number, number, number]; color: string; intensity: number; filter: string }> = {
  sunrise: { pos: [1.5, 80, 70], color: "#ffd2a8", intensity: 0.45, filter: "brightness(.92) sepia(.25) saturate(1.15)" },
  midday: { pos: [1.5, 210, 30], color: "#ffffff", intensity: 0.5, filter: "none" },
  golden: { pos: [1.5, 270, 80], color: "#ffb15e", intensity: 0.55, filter: "brightness(.9) sepia(.35) saturate(1.3)" },
  night: { pos: [1.5, 210, 30], color: "#8fa8ff", intensity: 0.3, filter: "brightness(.45) saturate(.8) hue-rotate(195deg) contrast(1.1)" },
};

export default function City3D() {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [time, setTime] = useState<Time>("midday");
  const [labels, setLabels] = useState(true);
  const [outlines, setOutlines] = useState(true);
  const [status, setStatus] = useState("Loading 3D Gurgaon…");

  useEffect(() => {
    document.title = "Gurgaon 3D: explore every sector in 3D | Kahan Rahe";
    let dead = false;
    let map: import("maplibre-gl").Map | null = null;
    (async () => {
      const ml = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (dead || !box.current) return;
      map = new ml.Map({
        container: box.current, style: STYLE, center: [77.0905, 28.4895], zoom: 15.3, pitch: 64, bearing: -28,
        maxPitch: 85, minZoom: 10, maxZoom: 19, attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "bottom-right");
      map.on("error", () => setStatus("Map tiles are slow or blocked on this network."));
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
        // Sector labels.
        m.addSource("sector-pts", { type: "geojson", data: { type: "FeatureCollection", features: SECTORS.map((s) => ({ type: "Feature", properties: { id: s.id, name: s.name }, geometry: { type: "Point", coordinates: [s.lng, s.lat] } })) } });
        m.addLayer({
          id: "sector-label", type: "symbol", source: "sector-pts", minzoom: 11.5,
          layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 15], "text-allow-overlap": false, "text-padding": 3, "text-pitch-alignment": "viewport" },
          paint: { "text-color": "#1e1b4b", "text-halo-color": "#ffffff", "text-halo-width": 1.8 },
        });
        m.on("click", "sector-label", (e) => { const id = e.features?.[0]?.properties?.id; if (id) location.href = `/sector/${id}`; });
        m.on("mouseenter", "sector-label", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "sector-label", () => (m.getCanvas().style.cursor = ""));
        setStatus("");
      });
    })();
    return () => { dead = true; map?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    const l = LIGHT[time];
    const apply = () => m?.setLight({ anchor: "map", position: l.pos, color: l.color, intensity: l.intensity });
    if (m?.isStyleLoaded()) apply(); else m?.once("load", apply);
    if (box.current) box.current.style.filter = l.filter;
  }, [time]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m?.isStyleLoaded()) return;
    for (const id of ["sector-label"]) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", labels ? "visible" : "none");
    for (const id of ["sector-line", "sector-fill"]) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", outlines ? "visible" : "none");
  }, [labels, outlines, status]);

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

  const fly = (lng: number, lat: number) => mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, pitch: 66, bearing: -25, duration: 2500, essential: true });

  return (
    <div className="c3d">
      <div ref={box} className="c3d-map" />
      <div className="c3d-title">
        <a href="/" className="c3d-back">← Back to map</a>
        <h1>GURGAON <span>3D</span></h1>
        <p>Every building from OpenStreetMap, with sector outlines. Tap a sector name to open it.</p>
      </div>
      <div className="c3d-top">
        <button className={labels ? "on" : ""} onClick={() => setLabels(!labels)}>Labels</button>
        <button className={outlines ? "on" : ""} onClick={() => setOutlines(!outlines)}>Sectors</button>
      </div>
      <div className="c3d-hint">Drag to move · scroll or pinch to zoom · right-drag or two fingers to tilt · W A S D to fly, Q E to turn</div>
      {status && <div className="c3d-status">{status}</div>}
      <div className="c3d-bottom">
        <div className="c3d-places">{PLACES.map(([n, lng, lat]) => <button key={n} onClick={() => fly(lng, lat)}>{n}</button>)}</div>
        <div className="c3d-time">
          {(["sunrise", "midday", "golden", "night"] as Time[]).map((t) => (
            <button key={t} className={time === t ? "on" : ""} onClick={() => setTime(t)}>{t === "golden" ? "Golden hour" : t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
