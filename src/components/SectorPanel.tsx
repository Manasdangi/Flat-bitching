import { sectorById } from "../data/sectors";
import { allScores, commute, matchScore, nearby, nearestMetro, PRIORITIES, type Office, type Weights } from "../lib/score";
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
  if (!s) return <p>Sector not found.</p>;
  const metro = nearestMetro(s);
  const c = commute(s, office);
  const sc = allScores(s, office);
  const m = matchScore(s, weights, office);

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

      <div className="actions">
        <button className={`btn small ${inCompare ? "ghost" : ""}`} onClick={onToggleCompare}>
          {inCompare ? "✓ In compare" : "+ Compare"}
        </button>
        <button className="btn small ghost" onClick={() => navigator.clipboard?.writeText(location.href)}>Copy link</button>
      </div>

      <div className="facts">
        <div><span>2BHK rent</span><b>{rupees(s.rent2bhk)}</b></div>
        <div><span>PG (single)</span><b>{rupees(s.pgRent)}</b></div>
        <div><span>PG availability</span><b>{s.pg}</b></div>
        <div><span>Nearest metro</span><b>{metro.station.name} · {metro.km.toFixed(1)} km</b></div>
        {c && office && <div><span>To {office.name}</span><b>~{c.roadKm.toFixed(0)} km · ~{c.minutes} min</b></div>}
      </div>

      <h3>Scores</h3>
      <ul className="scores">
        {PRIORITIES.map((p) => (
          <li key={p.key}><span>{p.icon} {p.label}</span><Bar v={sc[p.key]} /></li>
        ))}
      </ul>
      {!office && <p className="note">Set your office in the Match tab to see commute times.</p>}

      <div className="two-col">
        <div><h3>👍 Good</h3><ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul></div>
        <div><h3>⚠️ Watch out</h3><ul>{s.watchOut.map((h) => <li key={h}>{h}</li>)}</ul></div>
      </div>

      <h3>Nearby</h3>
      <div className="nearby">
        {([["hospital", "🏥 Hospitals"], ["school", "🎒 Schools"], ["mall", "🛍️ Malls & markets"]] as const).map(([k, label]) => {
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
      <div className="chips">{s.societies.map((x) => <span key={x} className="chip">{x}</span>)}</div>

      <p className="note">
        Rents are rough ranges from 2025–26 listings, nearby places are straight-line distances, and scores are editorial estimates. Metro distance and commute are calculated from approximate locations.
        Always visit at night and in monsoon, and check with residents before renting.
      </p>

      <Reviews sectorId={s.id} />
    </article>
  );
}
