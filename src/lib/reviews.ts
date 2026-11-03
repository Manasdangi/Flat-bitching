// Reviews live in Supabase when configured; otherwise this browser's localStorage (demo mode).
import { hasBackend, insert, select } from "./api";

export const ASPECTS = [
  { key: "r_clean", label: "Cleanliness" },
  { key: "r_safety", label: "Safety at night" },
  { key: "r_water", label: "Water supply" },
  { key: "r_power", label: "Power backup" },
  { key: "r_drain", label: "No waterlogging" },
] as const;
export type AspectKey = (typeof ASPECTS)[number]["key"];

export type Review = {
  id?: string;
  sectorId: string;
  society: string | null;
  name: string;
  rating: number; // 1–5 overall
  tags: string[];
  text: string;
  aspects: Partial<Record<AspectKey, number>>;
  createdAt: number;
};

export const REVIEW_TAGS = ["Live here", "Lived here", "PG", "Woman reviewer", "Family", "Working nearby"];

export const usingSupabase = hasBackend;

type Row = {
  id: string; sector_id: string; society: string | null; name: string; rating: number; tags: string[]; body: string; created_at: string;
} & Partial<Record<AspectKey, number | null>>;

const COLS = "id,sector_id,society,name,rating,tags,body,created_at,r_clean,r_safety,r_water,r_power,r_drain";

const fromRow = (r: Row): Review => ({
  id: r.id, sectorId: r.sector_id, society: r.society, name: r.name, rating: r.rating, tags: r.tags, text: r.body,
  aspects: Object.fromEntries(ASPECTS.filter((a) => r[a.key] != null).map((a) => [a.key, r[a.key]])) as Review["aspects"],
  createdAt: new Date(r.created_at).getTime(),
});

const LS_KEY = "gff-reviews";
const readLocal = (): Review[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]").map((r: Partial<Review>) => ({ ...r, society: r.society ?? null, aspects: r.aspects ?? {} }) as Review); } catch { return []; }
};

export async function listReviews(filter: { sectorId?: string; society?: string }): Promise<Review[]> {
  if (usingSupabase) {
    const params: Record<string, string> = { select: COLS, order: "created_at.desc", limit: "200" };
    if (filter.sectorId) params.sector_id = `eq.${filter.sectorId}`;
    if (filter.society) params.society = `eq.${filter.society}`;
    return (await select<Row>("reviews", params)).map(fromRow);
  }
  return readLocal()
    .filter((r) => (!filter.sectorId || r.sectorId === filter.sectorId) && (!filter.society || r.society === filter.society))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReview(r: Omit<Review, "id" | "createdAt">) {
  const clean = {
    sectorId: r.sectorId,
    society: r.society?.slice(0, 80) || null,
    name: r.name.trim().slice(0, 40) || "Anonymous",
    rating: Math.min(5, Math.max(1, Math.round(r.rating))),
    tags: r.tags.filter((t) => REVIEW_TAGS.includes(t)),
    text: r.text.trim().slice(0, 1000),
    aspects: Object.fromEntries(Object.entries(r.aspects).filter(([, v]) => v && v >= 1 && v <= 5)) as Review["aspects"],
  };
  if (usingSupabase) {
    await insert("reviews", {
      sector_id: clean.sectorId, society: clean.society, name: clean.name, rating: clean.rating, tags: clean.tags, body: clean.text,
      ...clean.aspects,
    });
    return;
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...readLocal(), { ...clean, createdAt: Date.now() }]));
  } catch {
    /* storage unavailable */
  }
}

export async function reportReview(id: string, reason: string) {
  if (!usingSupabase) return;
  await insert("review_reports", { review_id: id, reason: reason.slice(0, 200) });
}

export async function suggestCorrection(sectorId: string, topic: string, message: string) {
  await insert("corrections", { sector_id: sectorId, topic, message: message.trim().slice(0, 1000) });
}

/** Average of each aspect across reviews that rated it. */
export function aspectAverages(reviews: Review[]) {
  return ASPECTS.map((a) => {
    const vals = reviews.map((r) => r.aspects[a.key]).filter((v): v is number => typeof v === "number");
    return { ...a, avg: vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null, n: vals.length };
  });
}
