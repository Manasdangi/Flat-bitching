import { useRef, useState } from "react";
import { sectorById } from "../data/sectors";
import { linkProps } from "../lib/router";
import { track } from "../lib/track";

type Msg = { role: "user" | "assistant"; content: string };
const STARTERS = [
  "Which sectors are safest for a single woman near a metro?",
  "Cheapest sector for a 2 BHK with low flood risk?",
  "I work in Cyber City and want a PG under ₹15k. Where should I look?",
  "Sectors with good air and green space?",
];
const ERRORS: Record<string, string> = {
  not_configured: "The assistant isn't switched on yet. Please check back soon.",
  rate: "You're asking too fast. Wait a minute and try again.",
};

/** Turn "Sector 48" mentions into links to that sector's page. */
function linked(text: string) {
  return text.split(/(Sector \d+[A-D]?)/g).map((part, i) => {
    const m = part.match(/^Sector (\d+[A-D]?)$/);
    const s = m ? sectorById(m[1].toLowerCase()) : undefined;
    return s ? <a key={i} {...linkProps(`/sector/${s.id}`)}>{part}</a> : part;
  });
}

export default function Ask() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim().slice(0, 300);
    if (!question || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs(next); setQ(""); setErr(""); setBusy(true);
    track("ask_question");
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.answer) setErr(ERRORS[j.error] ?? "Couldn't get an answer right now. Please try again.");
      else setMsgs([...next, { role: "assistant", content: j.answer }]);
    } catch {
      setErr("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }), 50);
    }
  }

  return (
    <div className="panel-body ask">
      <h2>Ask about Gurgaon sectors</h2>
      <p className="note">Answers come only from this site's data: rents, PG prices, safety and other scores, metro distance and flood reports. They are rough estimates, not listings or legal advice. Visit at night and talk to residents before you decide.</p>
      {!msgs.length && (
        <div className="ask-starters">
          {STARTERS.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
      <div className="ask-log" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`ask-msg ${m.role}`}>{m.role === "assistant" ? linked(m.content) : m.content}</div>)}
        {busy && <div className="ask-msg assistant">Thinking…</div>}
        {err && <div className="ask-msg err">{err}</div>}
        <div ref={end} />
      </div>
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); send(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="e.g. Safe sector near Huda City Centre under ₹30k?" aria-label="Your question" />
        <button type="submit" className="cta" disabled={busy || !q.trim()}>Ask</button>
      </form>
    </div>
  );
}
