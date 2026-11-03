// Data loaded at runtime: sector outlines + road drive times (Supabase) and live AQI (Open-Meteo).
import { useEffect, useState } from "react";
import { hasBackend, select } from "./api";

export type Shape = { sector_id: string; geojson: GeoJSON.Geometry };
export type Drive = { sector_id: string; km: number; minutes_offpeak: number };

/** Peak-hour factor applied to OSRM free-flow times (Gurgaon rush hour is roughly 1.6–2×). */
export const PEAK_FACTOR = 1.8;

let shapesP: Promise<Shape[]> | null = null;
export function loadShapes() {
  shapesP ??= hasBackend ? select<Shape>("sector_shapes", { select: "sector_id,geojson" }).catch(() => []) : Promise.resolve([]);
  return shapesP;
}

const driveP = new Map<string, Promise<Map<string, Drive>>>();
export function loadDriveTimes(hub: string) {
  if (!driveP.has(hub)) {
    driveP.set(
      hub,
      hasBackend
        ? select<Drive>("drive_times", { select: "sector_id,km,minutes_offpeak", hub: `eq.${hub}` })
            .then((rows) => new Map(rows.map((r) => [r.sector_id, { ...r, km: Number(r.km) }])))
            .catch(() => new Map())
        : Promise.resolve(new Map()),
    );
  }
  return driveP.get(hub)!;
}

export function useShapes() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  useEffect(() => { loadShapes().then(setShapes); }, []);
  return shapes;
}

/** Drive times to a tech hub (by exact hub name), or an empty map for custom pins. */
export function useDriveTimes(hub: string | null) {
  const [m, setM] = useState<Map<string, Drive>>(new Map());
  useEffect(() => {
    let live = true;
    if (!hub) { setM(new Map()); return; }
    loadDriveTimes(hub).then((x) => live && setM(x));
    return () => { live = false; };
  }, [hub]);
  return m;
}

export type Aqi = { aqi: number; pm25: number; time: string };
const aqiCache = new Map<string, Promise<Aqi | null>>();
export function loadAqi(lat: number, lng: number) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (!aqiCache.has(key)) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5&timezone=Asia%2FKolkata`;
    aqiCache.set(
      key,
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (j?.current ? { aqi: Math.round(j.current.us_aqi), pm25: Math.round(j.current.pm2_5), time: j.current.time } : null))
        .catch(() => null),
    );
  }
  return aqiCache.get(key)!;
}

export function aqiBand(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "#16a34a" };
  if (aqi <= 100) return { label: "Moderate", color: "#ca8a04" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", color: "#ea580c" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#dc2626" };
  if (aqi <= 300) return { label: "Very unhealthy", color: "#9333ea" };
  return { label: "Hazardous", color: "#7f1d1d" };
}
