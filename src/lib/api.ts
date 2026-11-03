// Thin Supabase REST client (no SDK). All tables are protected by row-level security.
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const hasBackend = Boolean(URL_ && KEY);

/** Anonymous per-browser id, used only for spam rate limits. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem("gff-device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("gff-device", id);
    }
    return id;
  } catch {
    return "";
  }
}

let deviceHeaderOk = true; // falls back if a browser/proxy rejects the custom header

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  if (!hasBackend) throw new ApiError("No backend configured", 0);
  const base: Record<string, string> = { apikey: KEY!, "Content-Type": "application/json" };
  const dev = deviceId();
  try {
    return await fetch(`${URL_}/rest/v1/${path}`, {
      ...init,
      headers: { ...base, ...(deviceHeaderOk && dev ? { "x-device-id": dev } : {}), ...(init.headers as Record<string, string>) },
    });
  } catch (e) {
    if (!deviceHeaderOk) throw e;
    deviceHeaderOk = false; // retry once without the custom header (CORS edge cases)
    return fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...base, ...(init.headers as Record<string, string>) } });
  }
}

async function errorFrom(res: Response) {
  let msg = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body?.message) msg = body.message;
  } catch {
    /* ignore */
  }
  return new ApiError(msg, res.status);
}

export async function select<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const res = await call(`${table}?${new URLSearchParams(params)}`);
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function insert(table: string, row: Record<string, unknown>): Promise<void> {
  const res = await call(table, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
  if (!res.ok) throw await errorFrom(res);
}

export const isRateLimited = (e: unknown) => e instanceof ApiError && /rate_limited/.test(e.message);
export const friendlyError = (e: unknown, fallback: string) =>
  isRateLimited(e) ? (e as Error).message.replace(/^rate_limited:\s*/, "Limit reached: ") : fallback;
