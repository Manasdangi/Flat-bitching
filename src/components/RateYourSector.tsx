import { useState } from "react";
import { SECTORS } from "../data/sectors";
import { WOMEN_POLLS } from "../lib/community";
import { track } from "../lib/track";
import { ResidentPolls } from "./ResidentData";

/** A short, shareable page where residents answer four night-safety questions for their own sector. */
export default function RateYourSector() {
  const [id, setId] = useState(() => new URLSearchParams(location.search).get("sector") ?? "");
  const [msg, setMsg] = useState("");
  const url = `${location.origin}/rate${id ? `?sector=${id}` : ""}`;
  const text = "Live in Gurgaon? Take 30 seconds to rate how safe your sector feels at night. It helps other women choose where to live (anonymous):";
  const share = async () => {
    track("rate_share", { sector: id || "none" });
    try {
      if (navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard?.writeText(`${text} ${url}`); setMsg("Link copied!"); }
    } catch { /* cancelled */ }
  };
  return (
    <div className="panel-body">
      <p className="eyebrow">Help other women</p>
      <h2>Rate your sector in 30 seconds</h2>
      <p className="muted">Four one-tap questions about night safety, lighting, cabs and landlords. Anonymous. Answer only for a sector you live or have lived in. Your answers help the next woman choose where to live.</p>
      <select aria-label="Your sector" value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Choose your sector…</option>
        {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {id ? <ResidentPolls sectorId={id} only={WOMEN_POLLS} /> : <p className="muted small-txt">Pick a sector to start.</p>}
      <h3>Know someone who lives in Gurgaon?</h3>
      <p className="muted small-txt">More answers make the ratings more reliable for everyone.</p>
      <div className="row wrap">
        <button className="btn small" onClick={share}>📤 Share this page</button>
        <a className="btn small ghost" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer" onClick={() => track("rate_share", { sector: id || "none", via: "whatsapp" })}>WhatsApp</a>
      </div>
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
