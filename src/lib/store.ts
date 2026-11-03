import { useSyncExternalStore } from "react";

/** Tiny localStorage-backed store shared across components. Data never leaves the browser. */
export function createStore<T>(key: string, init: T) {
  let value: T = init;
  try {
    const raw = localStorage.getItem(key);
    if (raw) value = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const subs = new Set<() => void>();
  const get = () => value;
  const set = (next: T | ((prev: T) => T)) => {
    value = typeof next === "function" ? (next as (p: T) => T)(value) : next;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    subs.forEach((f) => f());
  };
  const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
  const use = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, use };
}

// ── Shortlist ──────────────────────────────────────────
export type SavedItem = { kind: "sector" | "society"; id: string; note: string; addedAt: number };
export const shortlist = createStore<SavedItem[]>("gff-shortlist", []);

export const isSaved = (items: SavedItem[], kind: SavedItem["kind"], id: string) => items.some((x) => x.kind === kind && x.id === id);
export function toggleSaved(kind: SavedItem["kind"], id: string) {
  shortlist.set((items) => isSaved(items, kind, id)
    ? items.filter((x) => !(x.kind === kind && x.id === id))
    : [...items, { kind, id, note: "", addedAt: Date.now() }]);
}
export function setNote(kind: SavedItem["kind"], id: string, note: string) {
  shortlist.set((items) => items.map((x) => (x.kind === kind && x.id === id ? { ...x, note: note.slice(0, 500) } : x)));
}

// ── Visit checklist (per sector) ───────────────────────
export const checklist = createStore<Record<string, string[]>>("gff-checklist", {});

// ── Money settings (local only) ────────────────────────
export const money = createStore<{ salary: number; people: number }>("gff-money", { salary: 0, people: 1 });
