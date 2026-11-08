// POST /api/ask  { messages: [{role:"user"|"assistant", content}] } → { answer }
// Uses Claude Haiku when ANTHROPIC_API_KEY is set (with prompt caching of the sector dataset), otherwise any OpenAI-compatible API
// (default: Groq) via LLM_API_KEY / GROQ_API_KEY.
import { dataset, SYSTEM } from "./_context.js";

const BASE = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
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

export const config = { runtime: "edge" }; // bundled like api/share.ts, so the src/ imports resolve

const handlers = {
  async fetch(req: Request) {
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const origin = req.headers.get("origin") ?? "";
    if (origin && !ALLOWED.test(origin)) return json({ error: "origin" }, 403);
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    const key = claudeKey || process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
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
      if (claudeKey) {
        // The system prompt + dataset is identical on every request, so mark it cacheable: repeat questions read it at a fraction of the price.
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", signal: AbortSignal.timeout(25_000),
          headers: { "Content-Type": "application/json", "x-api-key": claudeKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 2000,
            system: [{ type: "text", text: SYSTEM + dataset(), cache_control: { type: "ephemeral" } }], messages: msgs }),
        });
        if (!r.ok) { console.error("ask upstream", r.status, (await r.text()).slice(0, 200)); return json({ error: "upstream" }, 502); }
        const j = await r.json() as { content?: { type: string; text?: string }[]; stop_reason?: string; usage?: unknown };
        if (!j.content?.some((c) => c.type === "text" && c.text)) console.error("ask empty", j.stop_reason, JSON.stringify(j.content)?.slice(0, 200), JSON.stringify(j.usage));
        const answer = j.content?.filter((c) => c.type === "text").map((c) => c.text).join("").trim();
        return answer ? json({ answer }) : json({ error: "empty" }, 502);
      }
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

export default function handler(req: Request) { return handlers.fetch(req); }
