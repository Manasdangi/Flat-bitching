import { useState } from "react";
import { Tool } from "./Tool";
import type { Sector } from "../data/sectors";
import { areaCardText, livingCosts, nightHome } from "../lib/women";
import { commute, type Office } from "../lib/score";
import { createStore } from "../lib/store";
import { track } from "../lib/track";

/** Getting-home score and PG vs shared flat costs for one sector. */
export function NightAndCost({ sector, office }: { sector: Sector; office?: Office }) {
  const n = nightHome(sector), c = livingCosts(sector);
  const cm = commute(sector, office ?? null);
  const tone = n.score >= 4 ? "good" : n.score >= 3 ? "ok" : "low";
  return (
    <div className="women-card">
      <h3>🌙 Getting home after dark</h3>
      <div className={`women-score ${tone}`}><b>{n.score}/5</b><span>{n.label}. Nearest metro {n.km.toFixed(1)} km away.</span></div>
      <ul className="women-list">
        {n.tips.map((t) => <li key={t}>{t}</li>)}
        {cm && office && <li>🚕 Late-night cab home from {office.name}: about <b>{cm.offpeak ?? Math.max(10, Math.round(cm.minutes * 0.6))} min</b> on empty roads ({cm.roadKm.toFixed(1)} km)</li>}
      </ul>
      <AreaCardButton sector={sector} />
      <h3>💰 PG or a shared flat?</h3>
      <div className="facts">
        <div><span>PG, single room</span><b>~₹{c.pg}k</b></div>
        <div><span>Flat with 1 flatmate</span><b>~₹{c.share2}k</b></div>
        <div><span>Flat with 2 flatmates</span><b>~₹{c.share3}k</b></div>
      </div>
      <p className="muted small-txt">Per person per month. Shared-flat figures are your share of the 2BHK rent plus about ₹3k for bills and help. A PG usually includes food and no deposit hassle, a flat gives more privacy and control.</p>
    </div>
  );
}

const ITEMS: { id: string; text: string; weight: number; flag?: boolean }[] = [
  { id: "entry", text: "Controlled entry and a guard on duty 24 hours", weight: 2 },
  { id: "cctv", text: "CCTV in corridors and entrances, not inside rooms", weight: 2 },
  { id: "women", text: "Women-only building or floor, with clear visitor hours", weight: 2 },
  { id: "warden", text: "A female warden or a clear way to complain", weight: 1 },
  { id: "verified", text: "Owner and staff are police-verified", weight: 1 },
  { id: "fire", text: "Fire exits, extinguishers and working power backup", weight: 1 },
  { id: "agreement", text: "Written agreement with deposit refund timeline and notice period", weight: 2 },
  { id: "curfew", text: "Curfew and gate timings fit your work hours", weight: 1 },
  { id: "room", text: "Lockable room or locker; staff enter only with permission", weight: 1 },
];
type Saved = Record<string, { name: string; ticks: string[] }>;
const store = createStore<Saved>("gff-pg-scorecards", {});

/** Score a PG you are visiting. Saved on this device, per sector, so you can compare PGs afterwards. */
export function PgScorecard({ sectorId }: { sectorId: string }) {
  const all = store.use();
  const [name, setName] = useState("");
  const entries = Object.entries(all).filter(([k]) => k.startsWith(sectorId + ":"));
  const [cur, setCur] = useState<string | null>(null);
  const key = cur ?? "";
  const rec = cur ? all[cur] : null;
  const total = ITEMS.reduce((a, i) => a + i.weight, 0);
  const got = (r: { ticks: string[] }) => ITEMS.filter((i) => r.ticks.includes(i.id)).reduce((a, i) => a + i.weight, 0);
  const verdict = (g: number) => (g >= total - 1 ? "Looks good" : g >= total * 0.7 ? "Ask about the gaps" : "Risky, think twice");
  const add = () => {
    const n = name.trim(); if (!n) return;
    const k = `${sectorId}:${n}`; store.set((s) => ({ ...s, [k]: s[k] ?? { name: n, ticks: [] } })); setCur(k); setName("");
    track("pg_scorecard_add", { sector: sectorId });
  };
  const toggle = (id: string) => store.set((s) => ({ ...s, [key]: { ...s[key], ticks: s[key].ticks.includes(id) ? s[key].ticks.filter((x) => x !== id) : [...s[key].ticks, id] } }));
  return (
    <Tool title={<>🛏️ PG safety scorecard{entries.length ? <span className="muted"> ({entries.length} saved)</span> : null}</>}>
      <div className="tool-body">
        <p className="muted small-txt">Visiting PGs? Add each one, tick what you actually saw, and compare scores later. Saved only on this device.</p>
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="PG name" maxLength={60} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="btn small" onClick={add} disabled={!name.trim()}>Add</button>
        </div>
        {entries.length > 0 && (
          <div className="chips">
            {entries.map(([k, r]) => (
              <button key={k} className={`chip${cur === k ? " on" : ""}`} onClick={() => setCur(k)}>{r.name} · {got(r)}/{total}</button>
            ))}
          </div>
        )}
        {rec && (
          <>
            <ul className="checklist">
              {ITEMS.map((i) => (
                <li key={i.id}><label className="check"><input type="checkbox" checked={rec.ticks.includes(i.id)} onChange={() => toggle(i.id)} /> {i.text}</label></li>
              ))}
            </ul>
            <p className="note"><b>{rec.name}: {got(rec)}/{total}. {verdict(got(rec))}.</b> Unticked items are questions to ask the owner before you pay.</p>
            <button className="link small-txt" onClick={() => { store.set((s) => { const n = { ...s }; delete n[key]; return n; }); setCur(null); }}>Delete this PG</button>
          </>
        )}
      </div>
    </Tool>
  );
}

/** One-tap "leaving" and "reached home safe" messages for a trusted contact. Nothing is stored or sent from here. */
export function HomeSafe() {
  const [eta, setEta] = useState("30");
  const send = (text: string, kind: string) => { track("home_safe", { kind }); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener"); };
  return (
    <section className="safety-section">
      <h3>🏠 Tell someone you got home</h3>
      <p className="muted">Pick a friend or family member in WhatsApp and send one of these.</p>
      <label className="check">I'll be home in about
        <select value={eta} onChange={(e) => setEta(e.target.value)} aria-label="Minutes until home">
          {["15", "30", "45", "60", "90"].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
      </label>
      <div className="row wrap" style={{ marginTop: 8 }}>
        <button className="btn small" onClick={() => send(`I'm leaving now and should be home in about ${eta} minutes. I'll message when I'm in. If you don't hear from me, please call.`, "leaving")}>Send "leaving now"</button>
        <button className="btn small ghost" onClick={() => send("I've reached home safe. Thanks!", "arrived")}>Send "reached home"</button>
      </div>
    </section>
  );
}

function AreaCardButton({ sector }: { sector: Sector }) {
  const [done, setDone] = useState(false);
  const go = async () => {
    track("area_card_share", { sector: sector.id });
    const text = areaCardText(sector, `${location.origin}/sector/${sector.id}`);
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard?.writeText(text); setDone(true); } } catch { /* cancelled */ }
  };
  return <p><button className="btn small ghost" onClick={go}>{done ? "Copied!" : "📤 Share this area's safety card"}</button></p>;
}

const QUESTIONS = [
  "What are the rules on visitors, guests and late entry? Please share them in writing.",
  "Is there a curfew or gate closing time?",
  "Does the owner live in the building, and how much notice is given before anyone enters my room or flat?",
  "Are guards and CCTV in place at the gate and in common areas?",
  "Is a single woman tenant fine here, and are there any rules not in the agreement?",
  "What is the deposit, and in how many days is it refunded after I leave?",
  "What is the notice period and lock-in?",
  "Who do I call at night if there is a problem?",
];

/** Build a polite message to the owner or PG with the questions that matter. Copy it or send on WhatsApp. */
export function AskOwner({ sector }: { sector: Sector }) {
  const [picked, setPicked] = useState<number[]>([0, 1, 4, 5]);
  const [copied, setCopied] = useState(false);
  const text = `Hi, I'm interested in the place in ${sector.name}. Before I visit, could you please confirm:\n` + picked.sort((a, b) => a - b).map((i, n) => `${n + 1}. ${QUESTIONS[i]}`).join("\n") + "\nThank you!";
  return (
    <Tool title={<>💬 Questions to ask the owner or PG</>}>
      <div className="tool-body">
        <p className="muted small-txt">Tick what you want to ask, then send it before you visit. Clear answers in writing protect you later.</p>
        <ul className="checklist">
          {QUESTIONS.map((q, i) => (
            <li key={q}><label className="check"><input type="checkbox" checked={picked.includes(i)} onChange={() => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i])} /> {q}</label></li>
          ))}
        </ul>
        <div className="row wrap">
          <button className="btn small" disabled={!picked.length} onClick={() => { track("ask_owner", { sector: sector.id, via: "whatsapp" }); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener"); }}>Send on WhatsApp</button>
          <button className="btn small ghost" disabled={!picked.length} onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* blocked */ } }}>{copied ? "Copied!" : "Copy message"}</button>
        </div>
      </div>
    </Tool>
  );
}
