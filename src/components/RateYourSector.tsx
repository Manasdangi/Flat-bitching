import { useState } from "react";
import { SECTORS } from "../data/sectors";
import { WOMEN_POLLS } from "../lib/community";
import { track } from "../lib/track";
import { ResidentPolls } from "./ResidentData";

function SectorSearch({ id, onPick }: { id: string; onPick: (id: string) => void }) {
  const cur = SECTORS.find((x) => x.id === id);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hits = SECTORS.filter((x) => !q || norm(x.name).includes(norm(q)) || x.id.toLowerCase() === q.trim().toLowerCase()).slice(0, 12);
  return (
    <div className="sector-search">
      <input type="search" aria-label="Search your sector" placeholder="Search your sector, e.g. 52 or Palam Vihar" autoComplete="off"
        value={open ? q : cur?.name ?? q} onFocus={() => { setOpen(true); setQ(""); }} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <ul className="sector-results" role="listbox">
          {hits.length ? hits.map((x) => <li key={x.id}><button type="button" role="option" aria-selected={x.id === id} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(x.id); setQ(""); setOpen(false); }}>{x.name}</button></li>) : <li className="muted small-txt" style={{ padding: 10 }}>No sector found</li>}
        </ul>
      )}
    </div>
  );
}

/** A short, shareable page where residents answer night-safety questions for their own sector. */
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
      <p className="muted">Nine one-tap questions about night safety, lighting, patrols, cabs and landlords. Anonymous. Answer only for a sector you live or have lived in. Your answers help the next woman choose where to live.</p>
      <SectorSearch id={id} onPick={setId} />
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
