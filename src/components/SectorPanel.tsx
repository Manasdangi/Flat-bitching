import { sectorById } from "../data/sectors";
import { linkProps } from "../lib/router";
import { allScores, commute, matchScore, nearby, nearestMetro, PRIORITIES, type Office, type Weights } from "../lib/score";
import { isNamedSociety, slugify } from "../lib/societies";
import { AqiBadge, SuggestFix } from "./Extras";
import Reviews from "./Reviews";

type Props = {
  id: string;
  weights: Weights;
  office: Office;
  onClose: () => void;
  inCompare: boolean;
  onToggleCompare: () => void;
};

export const Bar = ({ v }: { v: number | null }) => (
  <span className="bar" aria-label={v == null ? "n/a" : `${v} of 5`}>
    {v == null ? <span className="muted">n/a</span> : <span className="fill" style={{ width: `${(v / 5) * 100}%` }} />}
  </span>
);

const rupees = ([a, b]: [number, number]) => `₹${a}k – ₹${b}k`;

export default function SectorPanel({ id, weights, office, onClose, inCompare, onToggleCompare }: Props) {
  const s = sectorById(id);
  if (!s) return <div className="panel-body"><h2>Sector not found</h2><p>We don't cover this one yet.</p></div>;
  const metro = nearestMetro(s);
  const c = commute(s, office);
  const sc = allScores(s, office);
  const m = matchScore(s, weights, office);
  const named = s.societies.filter(isNamedSociety);

  const share = async () => {
    const url = location.origin + `/sector/${s.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${s.name} – Gurgaon Flat Finder`, url });
      else await navigator.clipboard?.writeText(url);
    } catch { /* cancelled */ }
  };

  return (
    <article className="panel-body">
      <div className="row between">
        <div>
          <p className="eyebrow">{s.zone}</p>
          <h2>{s.name}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      {m != null && <p className="match">Your match: <b>{m}%</b></p>}
      <p>{s.summary}</p>
      <AqiBadge lat={s.lat} lng={s.lng} />

      <div className="actions">
        <button className={`btn small ${inCompare ? "ghost" : ""}`} onClick={onToggleCompare}>
          {inCompare ? "✓ In compare" : "+ Compare"}
        </button>
        <button className="btn small ghost" onClick={share}>Share</button>
      </div>

      <div className="facts">
        <div><span>2BHK rent</span><b>{rupees(s.rent2bhk)}</b></div>
        <div><span>PG (single)</span><b>{rupees(s.pgRent)}</b></div>
        <div><span>PG availability</span><b>{s.pg}</b></div>
        <div><span>Nearest metro</span><b>{metro.station.name} · {metro.km.toFixed(1)} km</b></div>
        {c && office && (
          <div className="wide">
            <span>Drive to {office.name}</span>
            <b>{c.roadKm.toFixed(1)} km · ~{c.minutes} min at peak{c.offpeak != null && <> · {c.offpeak} min off-peak</>}</b>
            <small className="muted">{c.real ? "Road route via OpenStreetMap; peak time estimated" : office.name.includes("pinned") ? "Rough estimate for a pinned location" : "Rough estimate (route data loading or unavailable)"}</small>
          </div>
        )}
      </div>

      <h3>Scores</h3>
      <ul className="scores">
        {PRIORITIES.map((p) => (
          <li key={p.key}><span>{p.icon} {p.label}</span><Bar v={sc[p.key]} /></li>
        ))}
      </ul>
      {!office && <p className="note">Pick your office in the Match tab to see real drive times.</p>}

      <div className="two-col">
        <div><h3>👍 Good</h3><ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul></div>
        <div><h3>⚠️ Watch out</h3><ul>{s.watchOut.map((h) => <li key={h}>{h}</li>)}</ul></div>
      </div>

      <h3>Nearby</h3>
      <div className="nearby">
        {([["tech", "💼 Tech & office hubs"], ["hangout", "🎉 Happening places"], ["hospital", "🏥 Hospitals"], ["school", "🎒 Schools"], ["mall", "🛍️ Malls & markets"]] as const).map(([k, label]) => {
          const list = nearby(s, k);
          return (
            <div key={k}>
              <b>{label}</b>
              {list.length === 0 ? <p className="muted">None of our listed ones within 6 km</p> : (
                <ul>{list.map((l) => <li key={l.name + l.area}>{l.name} <span className="muted">· {l.area} · {l.km.toFixed(1)} km</span></li>)}</ul>
              )}
            </div>
          );
        })}
      </div>

      <h3>Popular societies & housing</h3>
      <div className="chips">
        {s.societies.map((x) => isNamedSociety(x)
          ? <a key={x} className="chip link-chip" {...linkProps(`/society/${slugify(x)}`)}>🏢 {x} ›</a>
          : <span key={x} className="chip">{x}</span>)}
      </div>

      <p className="note">
        Sector outlines and drive times come from OpenStreetMap. Rents are rough ranges from 2025–26 listings, nearby places are straight-line
        distances, and scores are editorial estimates until enough residents rate them. Visit at night and in monsoon before renting.
      </p>
      <SuggestFix sectorId={s.id} />

      <Reviews sectorId={s.id} societies={named} />
    </article>
  );
}
