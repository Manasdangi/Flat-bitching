// Resident polls + anonymous rent reports (Supabase RPC/REST). No-ops when the backend isn't configured.
import { hasBackend, insert, rpc } from "./api";
import type { PriorityKey } from "./score";

export const POLLS = [
  { key: "water", q: "Does water arrive every day?", icon: "🚰" },
  { key: "power", q: "Are power cuts rare?", icon: "💡" },
  { key: "night_safe", q: "Safe to walk at 10pm?", icon: "🌙" },
  { key: "flood", q: "Does it stay dry in heavy rain?", icon: "☔" },
  { key: "clean", q: "Are roads and parks kept clean?", icon: "🧹" },
  { key: "lit_streets", q: "Are streets well lit at night?", icon: "🔦" },
  { key: "late_cab", q: "Is an auto or cab easy to get after 9pm?", icon: "🚕" },
  { key: "single_friendly", q: "Do landlords and PGs here accept single women?", icon: "🏠" },
] as const;
export const WOMEN_POLLS: PollKey[] = ["night_safe", "lit_streets", "late_cab", "single_friendly"];
export type PollKey = (typeof POLLS)[number]["key"];
export type PollAnswer = "yes" | "sometimes" | "no";
export type PollCounts = Record<PollKey, Record<PollAnswer, number>>;

export const communityEnabled = hasBackend;

export async function loadPolls(sectorId: string): Promise<PollCounts> {
  const out = Object.fromEntries(POLLS.map((p) => [p.key, { yes: 0, sometimes: 0, no: 0 }])) as PollCounts;
  const rows = await rpc<{ question: PollKey; answer: PollAnswer; n: number }>("poll_counts", { p_sector: sectorId });
  for (const r of rows) if (out[r.question]) out[r.question][r.answer] = Number(r.n);
  return out;
}

const votedKey = (sectorId: string) => `gff-voted-${sectorId}`;
const POLL_TO_PRIORITY = { water: "water", flood: "drain", night_safe: "safety", lit_streets: "safety", clean: "clean" } as const;
const POINTS: Record<PollAnswer, number> = { yes: 5, sometimes: 3, no: 1 };

/** All sectors' poll results as per-priority resident means (used to adjust scores). */
export async function loadCommunityScores() {
  const rows = await rpc<{ sector_id: string; question: string; answer: PollAnswer; n: number }>("poll_summary", {});
  const acc = new Map<string, Partial<Record<PriorityKey, { sum: number; n: number }>>>();
  for (const r of rows) {
    const key = POLL_TO_PRIORITY[r.question as keyof typeof POLL_TO_PRIORITY];
    if (!key || !POINTS[r.answer]) continue;
    const n = Number(r.n);
    const sec = acc.get(r.sector_id) ?? {};
    const cur = sec[key] ?? { sum: 0, n: 0 };
    sec[key] = { sum: cur.sum + POINTS[r.answer] * n, n: cur.n + n };
    acc.set(r.sector_id, sec);
  }
  const out = new Map<string, Partial<Record<PriorityKey, { mean: number; n: number }>>>();
  acc.forEach((sec, id) => out.set(id, Object.fromEntries(Object.entries(sec).map(([k, v]) => [k, { mean: v.sum / v.n, n: v.n }]))));
  return out;
}

export const votedAlready = (sectorId: string): PollKey[] => {
  try { return JSON.parse(localStorage.getItem(votedKey(sectorId)) || "[]"); } catch { return []; }
};
const markVoted = (sectorId: string, q: PollKey) => {
  try { localStorage.setItem(votedKey(sectorId), JSON.stringify([...new Set([...votedAlready(sectorId), q])])); } catch { /* ignore */ }
};

export async function vote(sectorId: string, question: PollKey, answer: PollAnswer) {
  try {
    await insert("poll_votes", { sector_id: sectorId, question, answer });
  } catch (e) {
    if (/already answered/.test((e as Error).message)) markVoted(sectorId, question);
    throw e;
  }
  markVoted(sectorId, question);
}

export type HomeType = "pg" | "1bhk" | "2bhk" | "3bhk";
export const HOME_LABEL: Record<HomeType, string> = { pg: "PG (single)", "1bhk": "1 BHK", "2bhk": "2 BHK", "3bhk": "3 BHK" };
export type RentRow = { home_type: HomeType; n: number; p25: number; median: number; p75: number; avg_maintenance: number | null; avg_deposit: number | null };

export const loadRentSummary = (sectorId: string) =>
  rpc<RentRow>("rent_summary", { p_sector: sectorId }).then((rows) => rows.map((r) => ({ ...r, n: Number(r.n) })));

export async function addRentReport(r: { sectorId: string; society: string | null; homeType: HomeType; rent: number; maintenance?: number; depositMonths?: number; brokerageMonths?: number }) {
  await insert("rent_reports", {
    sector_id: r.sectorId, society: r.society, home_type: r.homeType, rent: Math.round(r.rent),
    maintenance: r.maintenance ?? null, deposit_months: r.depositMonths ?? null, brokerage_months: r.brokerageMonths ?? null,
  });
}
