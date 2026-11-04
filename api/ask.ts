// POST /api/ask  { messages: [{role:"user"|"assistant", content}] } → { answer }
// Calls any OpenAI-compatible chat API (default: Groq). Needs LLM_API_KEY (or GROQ_API_KEY) in the Vercel project env.
import { dataset, SYSTEM } from "./_context.js";

const BASE = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
const ALLOWED = /^(https:\/\/(www\.)?kahanrahe\.online|https:\/\/gurgaon-flat-finder[a-z0-9-]*\.vercel\.app|http:\/\/localhost(:\d+)?)$/;

// Best-effort per-instance rate limit (serverless instances are short-lived, so this only blunts casual abuse).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), win = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  win.push(now); hits.set(ip, win);
  if (hits.size > 5000) hits.clear();
  return win.length > 8;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const origin = req.headers.get("origin") ?? "";
    if (origin && !ALLOWED.test(origin)) return json({ error: "origin" }, 403);
    const key = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
    if (!key) return json({ error: "not_configured" }, 503);
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
    if (limited(ip)) return json({ error: "rate" }, 429);

    let body: { messages?: { role?: string; content?: unknown }[] };
    try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
    const msgs = (body.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-6).map((m) => ({ role: m.role as string, content: (m.content as string).slice(0, 500) }));
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "no_question" }, 400);

    try {
      const r = await fetch(`${BASE}/chat/completions`, {
        method: "POST", signal: AbortSignal.timeout(25_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: MODEL, temperature: 0.2, max_tokens: 450, messages: [{ role: "system", content: SYSTEM + dataset() }, ...msgs] }),
      });
      if (!r.ok) { console.error("ask upstream", r.status, (await r.text()).slice(0, 200)); return json({ error: "upstream" }, 502); }
      const j = await r.json() as { choices?: { message?: { content?: string } }[] };
      const answer = j.choices?.[0]?.message?.content?.trim();
      return answer ? json({ answer }) : json({ error: "empty" }, 502);
    } catch (e) {
      console.error("ask failed", (e as Error)?.message);
      return json({ error: "failed" }, 502);
    }
  },
};
