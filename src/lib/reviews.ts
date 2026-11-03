// Reviews are stored in Supabase (Postgres + REST) when VITE_SUPABASE_* env vars are set.
// Without them, reviews fall back to this browser's localStorage (only you see them).
// Uses the REST API directly via fetch, so no SDK is added to the bundle.

export type Review = {
  id?: string;
  sectorId: string;
  name: string;
  rating: number; // 1–5
  tags: string[];
  text: string;
  createdAt: number;
};

export const REVIEW_TAGS = ["Live here", "Lived here", "PG", "Woman reviewer", "Family", "Working nearby"];

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const usingSupabase = Boolean(URL_ && KEY);

const headers = () => ({ apikey: KEY!, "Content-Type": "application/json" });

type Row = { id: string; sector_id: string; name: string; rating: number; tags: string[]; body: string; created_at: string };

const LS_KEY = "gff-reviews";
const readLocal = (): Review[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
};

export async function listReviews(sectorId: string): Promise<Review[]> {
  if (usingSupabase) {
    const qs = new URLSearchParams({ sector_id: `eq.${sectorId}`, order: "created_at.desc", select: "*", limit: "100" });
    const res = await fetch(`${URL_}/rest/v1/reviews?${qs}`, { headers: headers() });
    if (!res.ok) throw new Error(`Load failed: ${res.status}`);
    const rows: Row[] = await res.json();
    return rows.map((r) => ({
      id: r.id, sectorId: r.sector_id, name: r.name, rating: r.rating, tags: r.tags, text: r.body,
      createdAt: new Date(r.created_at).getTime(),
    }));
  }
  return readLocal().filter((r) => r.sectorId === sectorId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReview(r: Omit<Review, "id" | "createdAt">) {
  const clean = {
    sectorId: r.sectorId,
    name: r.name.trim().slice(0, 40) || "Anonymous",
    rating: Math.min(5, Math.max(1, Math.round(r.rating))),
    tags: r.tags.filter((t) => REVIEW_TAGS.includes(t)),
    text: r.text.trim().slice(0, 1000),
  };
  if (usingSupabase) {
    const res = await fetch(`${URL_}/rest/v1/reviews`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=minimal" },
      body: JSON.stringify({ sector_id: clean.sectorId, name: clean.name, rating: clean.rating, tags: clean.tags, body: clean.text }),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    return;
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...readLocal(), { ...clean, createdAt: Date.now() }]));
  } catch {
    /* storage unavailable */
  }
}
