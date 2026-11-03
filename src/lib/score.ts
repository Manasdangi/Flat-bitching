import { LANDMARKS, METRO, type Landmark, type Sector } from "../data/sectors";

export type Office = { name: string; lat: number; lng: number } | null;

export const PRIORITIES = [
  { key: "clean", label: "Clean society", icon: "🧹" },
  { key: "safety", label: "Women safety", icon: "🛡️" },
  { key: "transit", label: "Metro access", icon: "🚇" },
  { key: "air", label: "Clean air", icon: "🌿" },
  { key: "market", label: "Near market", icon: "🛒" },
  { key: "green", label: "Parks & greenery", icon: "🌳" },
  { key: "drain", label: "No waterlogging", icon: "☔" },
  { key: "afford", label: "Affordable", icon: "💰" },
  { key: "health", label: "Near a big hospital", icon: "🏥" },
  { key: "schools", label: "Good schools nearby", icon: "🎒" },
  { key: "commute", label: "Short office commute", icon: "🏢" },
] as const;

export type PriorityKey = (typeof PRIORITIES)[number]["key"];
export type Weights = Record<PriorityKey, number>;

export const ZERO_WEIGHTS = Object.fromEntries(PRIORITIES.map((p) => [p.key, 0])) as Weights;

export function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestMetro(sec: Sector) {
  let best = METRO[0];
  let bestKm = Infinity;
  for (const m of METRO) {
    const d = km(sec.lat, sec.lng, m.lat, m.lng);
    if (d < bestKm) { best = m; bestKm = d; }
  }
  return { station: best, km: bestKm };
}

const band = (v: number, cuts: number[]) => {
  // cuts ascending; v <= cuts[0] → 5 … else 1
  for (let i = 0; i < cuts.length; i++) if (v <= cuts[i]) return 5 - i;
  return 1;
};

/** Nearest landmarks of a kind, closest first. */
export function nearby(sec: Sector, kind: Landmark["kind"], n = 3, maxKm = 6) {
  return LANDMARKS.filter((l) => l.kind === kind)
    .map((l) => ({ ...l, km: km(sec.lat, sec.lng, l.lat, l.lng) }))
    .filter((l) => l.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

export const healthScore = (sec: Sector) => band(nearby(sec, "hospital", 1, 99)[0]?.km ?? 99, [1.5, 3, 5, 8]);
export const schoolScore = (sec: Sector) => {
  const within3 = nearby(sec, "school", 10, 3).length;
  return within3 >= 3 ? 5 : within3 === 2 ? 4 : within3 === 1 ? 3 : nearby(sec, "school", 1, 6).length ? 2 : 1;
};

export const transitScore = (sec: Sector) => band(nearestMetro(sec).km, [1, 2, 3.5, 6]);
export const affordScore = (sec: Sector) => band((sec.rent2bhk[0] + sec.rent2bhk[1]) / 2, [28, 36, 48, 70]);

// Rough road estimate: straight line × 1.4, ~20 km/h average in peak traffic.
export function commute(sec: Sector, office: Office) {
  if (!office) return null;
  const roadKm = km(sec.lat, sec.lng, office.lat, office.lng) * 1.4;
  return { roadKm, minutes: Math.round((roadKm / 20) * 60 + 5), score: band(roadKm, [4, 8, 13, 20]) };
}

export function allScores(sec: Sector, office: Office): Record<PriorityKey, number | null> {
  return {
    ...sec.scores,
    transit: transitScore(sec),
    afford: affordScore(sec),
    health: healthScore(sec),
    schools: schoolScore(sec),
    commute: commute(sec, office)?.score ?? null,
  };
}

/** 0–100 match, or null when no priority is set. */
export function matchScore(sec: Sector, w: Weights, office: Office): number | null {
  const sc = allScores(sec, office);
  let sum = 0;
  let wsum = 0;
  for (const p of PRIORITIES) {
    const v = sc[p.key];
    if (!w[p.key] || v == null) continue;
    sum += w[p.key] * v;
    wsum += w[p.key];
  }
  if (!wsum) return null;
  return Math.round(((sum / wsum - 1) / 4) * 100);
}

export function matchColor(m: number | null) {
  if (m == null) return "#6366f1";
  // red → amber → green
  const hue = Math.round((m / 100) * 130);
  return `hsl(${hue} 75% 45%)`;
}
