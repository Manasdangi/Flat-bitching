// Resident polls + anonymous rent reports (Supabase RPC/REST). No-ops when the backend isn't configured.
import { hasBackend, insert, rpc } from "./api";

export const POLLS = [
  { key: "water", q: "Does water arrive every day?", icon: "🚰" },
  { key: "power", q: "Are power cuts rare?", icon: "💡" },
  { key: "night_safe", q: "Safe to walk at 10pm?", icon: "🌙" },
  { key: "flood", q: "Does it stay dry in heavy rain?", icon: "☔" },
  { key: "clean", q: "Are roads and parks kept clean?", icon: "🧹" },
] as const;
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
