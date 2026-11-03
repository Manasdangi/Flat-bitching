import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { TileLayer, useMap } from "react-leaflet";

// Ola Maps vector basemap (India-focused, free tier) drawn inside the Leaflet map, with OpenStreetMap as a fallback.
// The key is public in the browser by design: restrict it to our domains in the Ola console.
const KEY = import.meta.env.VITE_OLA_MAPS_KEY as string | undefined;
const OLA = "https://api.olamaps.io";
const styleUrl = (dark: boolean) => `${OLA}/tiles/vector/v1/styles/${dark ? "default-dark-standard" : "default-light-standard"}/style.json`;

/** True when the page is showing the dark theme (explicit toggle, or "auto" following the phone). */
function useIsDark() {
  const read = () => {
    const t = document.documentElement.getAttribute("data-theme");
    return t === "dark" || (t !== "light" && Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches));
  };
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const on = () => setDark(read());
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", on);
    return () => { mo.disconnect(); mq?.removeEventListener?.("change", on); };
  }, []);
  return dark;
}

function OsmTiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

function OlaVector({ dark, onFail }: { dark: boolean; onFail: (why: string) => void }) {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;
    const timers: number[] = [];
    (async () => {
      try {
        const [{ maplibreGL }, ml, worker] = await Promise.all([
          import("@maplibre/maplibre-gl-leaflet"),
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        if (cancelled) return;
        ml.setWorkerUrl(worker.default);
        let errors = 0;
        const gl = maplibreGL({
          style: styleUrl(dark),
          attributionControl: { customAttribution: '&copy; <a href="https://maps.olakrutrim.com">Ola Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
          // The style's tile, sprite and font URLs don't carry the key, so add it to every Ola request.
          transformRequest: (url: string) => (url.startsWith(OLA) && !url.includes("api_key=")
            ? { url: `${url}${url.includes("?") ? "&" : "?"}api_key=${KEY}` } : undefined),
        });
        gl.addTo(map);
        layer = gl;
        const m = gl.getMaplibreMap();
        let loaded = false;
        const giveUp = window.setTimeout(() => { if (!loaded) onFail("timeout: map not loaded after 12s"); }, 12000); // never leave a blank map
        timers.push(giveUp);
        m.once("load", () => { loaded = true; window.clearTimeout(giveUp); });
        m.on("error", (e) => {
          const ev = e as unknown as { error?: { status?: number; message?: string }; sourceId?: string; tile?: unknown };
          const status = ev.error?.status;
          const why = `${status ?? "no status"} ${(ev.error?.message ?? "").replace(/api_key=[^&\s]+/g, "api_key=***")} ${ev.sourceId ? "(source " + ev.sourceId + ")" : "(style)"}`.trim();
          const styleLevel = !loaded && !ev.sourceId && !ev.tile; // the style itself couldn't load
          // Bad key, domain not allowed, quota used up, or style unreachable: go back to OpenStreetMap.
          // A few stray tile errors after loading are normal.
          if (status === 401 || status === 403 || status === 429 || styleLevel || ++errors >= 6) onFail(`map error: ${why}`);
        });
      } catch (err) {
        if (!cancelled) onFail(`exception: ${(err as Error)?.message ?? err}`); // e.g. no WebGL on an old phone
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      if (layer) map.removeLayer(layer);
    };
  }, [map, dark, onFail]);
  return null;
}

const debug = typeof location !== "undefined" && new URLSearchParams(location.search).has("mapdebug");

export default function Basemap() {
  const dark = useIsDark();
  const [failed, setFailed] = useState<string | null>(KEY ? null : "no key in this build (VITE_OLA_MAPS_KEY missing)");
  const fail = (why: string) => { console.warn("Ola basemap fallback to OpenStreetMap:", why); setFailed((f) => f ?? why); };
  const note = debug && createPortal(
    <div className="map-debug">{failed ? `Basemap: OpenStreetMap fallback. Reason: ${failed}` : "Basemap: Ola Maps (loading or loaded)"}</div>, document.body);
  if (failed) return <>{note}<OsmTiles /></>;
  return <>{note}<OlaVector dark={dark} onFail={fail} /></>;
}
