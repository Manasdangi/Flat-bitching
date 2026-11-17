// Free-text feedback and the unique-visitor counter (Supabase). Both no-op when the backend isn't configured.
import { deviceId, hasBackend, insert, rpc } from "./api";

export const feedbackEnabled = hasBackend;

export async function sendFeedback(message: string, contact: string) {
  await insert("feedback", {
    message: message.trim().slice(0, 1000),
    contact: contact.trim().slice(0, 120) || null,
    page: (location.pathname + location.search).slice(0, 200),
  });
}

/**
 * Counts this browser once as a unique visitor and returns the total so far, or null when it can't be counted.
 * "Unique" means one browser or device (a random id kept in localStorage), not one person. Automated browsers are skipped.
 */
export async function recordVisit(): Promise<number | null> {
  if (!hasBackend || (typeof navigator !== "undefined" && navigator.webdriver)) return null;
  const id = deviceId();
  if (!id) return null;
  try {
    const rows = await rpc<number | string>("record_visit", { p_visitor: id });
    const n = Number(Array.isArray(rows) ? rows[0] : rows);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
