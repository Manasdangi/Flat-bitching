// Free-text feedback and the unique-visitor counter (Supabase). Both no-op when the backend isn't configured.
import { deviceId, hasBackend, insert, rpc } from "./api";

export const feedbackEnabled = hasBackend;

export async function sendFeedback(message: string) {
  await insert("feedback", {
    message: message.trim().slice(0, 1000),
    page: (location.pathname + location.search).slice(0, 200),
  });
}

/**
 * Counts this browser once as a unique visitor and returns the totals so far, or null when it can't be counted.
 * "Unique" means one browser or device (a random id kept in localStorage), not one person.
 * "Views" are total visits (a return after 30+ minutes counts again). Automated browsers are skipped.
 */
export async function recordVisit(): Promise<{ unique: number; views: number } | null> {
  if (!hasBackend || (typeof navigator !== "undefined" && navigator.webdriver)) return null;
  const id = deviceId();
  if (!id) return null;
  try {
    type Stats = { unique: number; views: number };
    const r = (await rpc<Stats>("record_visit_stats", { p_visitor: id })) as unknown as Stats | Stats[];
    const o = Array.isArray(r) ? r[0] : r;
    const unique = Number(o?.unique), views = Number(o?.views);
    return unique > 0 && views > 0 ? { unique, views } : null;
  } catch {
    return null;
  }
}
