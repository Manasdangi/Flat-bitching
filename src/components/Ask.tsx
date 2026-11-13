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
  const sectors = (chunk: string, k: string) => chunk.split(/(Sector \d+[A-D]?)/g).map((part, i) => {
    const m = part.match(/^Sector (\d+[A-D]?)$/);
    const s = m ? sectorById(m[1].toLowerCase()) : undefined;
    return s ? <a key={k + i} {...linkProps(`/sector/${s.id}`)}>{part}</a> : part;
  });
  // The model sometimes writes **bold**: show it as bold instead of raw asterisks.
  return text.replace(/^#{1,4}\s+/gm, "").split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <b key={i}>{sectors(part.slice(2, -2), `b${i}`)}</b> : sectors(part, `t${i}`));
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

  // Voice question: browser speech recognition fills the box live; when you stop speaking it is sent.
  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : undefined;
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);
  const heard = useRef("");

  function toggleVoice() {
    if (listening) { rec.current?.stop(); return; }
    if (!SR || busy) return;
    const r = new SR();
    r.lang = "en-IN"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    heard.current = "";
    r.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      heard.current = t; setQ(t);
    };
    r.onerror = (e: any) => {
      setListening(false);
      setErr(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Microphone is blocked. Allow mic access for this site and try again." : e.error === "no-speech" ? "Didn't hear anything. Tap the mic and try again." : "Voice didn't work. Please type your question.");
    };
    r.onend = () => { setListening(false); const t = heard.current.trim(); if (t) { track("ask_voice"); send(t); } };
    rec.current = r; setErr("");
    try { r.start(); setListening(true); } catch { setListening(false); }
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
      {msgs.length > 0 && !busy && <button type="button" className="link small-txt" onClick={() => { setMsgs([]); setErr(""); }}>Clear chat</button>}
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); send(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder={listening ? "Listening… speak your question" : "Ask e.g. safe sector near Cyber City"} enterKeyHint="send" aria-label="Your question" />
        {SR && <button type="button" className={`ask-mic${listening ? " on" : ""}`} onClick={toggleVoice} disabled={busy} aria-label={listening ? "Stop and send voice question" : "Ask by voice"} title={listening ? "Tap to send" : "Ask by voice"}>{listening ? "⏹" : "🎤"}</button>}
        <button type="submit" className="btn" disabled={busy || !q.trim()}>Ask</button>
      </form>
    </div>
  );
}
