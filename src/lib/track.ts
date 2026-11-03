// Vercel Web Analytics custom events (no-op until analytics loads; never sends personal data).
import { track as vercelTrack } from "@vercel/analytics";

export function track(name: string, props?: Record<string, string | number | boolean>) {
  try {
    vercelTrack(name, props);
  } catch {
    /* analytics unavailable */
  }
}
