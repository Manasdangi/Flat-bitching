import { OFFICES, SECTORS } from "../data/sectors";
import { matchScore, PRIORITIES, ZERO_WEIGHTS, type Office, type Weights } from "../lib/score";

type Props = {
  weights: Weights;
  setWeights: (w: Weights) => void;
  office: Office;
  setOffice: (o: Office) => void;
  pickingOffice: boolean;
  setPickingOffice: (v: boolean) => void;
  budget: number;
  setBudget: (n: number) => void;
  onSelect: (id: string) => void;
};

const PRESETS: { label: string; w: Partial<Weights> }[] = [
  { label: "👩 Safe for women", w: { safety: 5, transit: 3, market: 3, clean: 2 } },
  { label: "🚇 No car", w: { transit: 5, market: 4, commute: 3 } },
  { label: "👨‍👩‍👧 Family", w: { safety: 4, green: 4, clean: 4, drain: 3 } },
  { label: "💸 Budget", w: { afford: 5, commute: 3, transit: 2 } },
  { label: "🌿 Clean air", w: { air: 5, green: 4, clean: 3 } },
];

export default function Matcher(p: Props) {
  const active = Object.values(p.weights).some(Boolean);
  const ranked = SECTORS.map((s) => ({ s, m: matchScore(s, p.weights, p.office) ?? 0 }))
    .filter(({ s }) => !p.budget || s.rent2bhk[0] <= p.budget)
    .sort((a, b) => b.m - a.m)
    .slice(0, 10);

  return (
    <div className="panel-body">
      <h2>What matters to you?</h2>
      <p className="muted">Set your priorities from 0 to 5. The map colours each sector by how well it matches.</p>

      <div className="chips">
        {PRESETS.map((pr) => (
          <button key={pr.label} className="chip" onClick={() => p.setWeights({ ...ZERO_WEIGHTS, ...pr.w })}>{pr.label}</button>
        ))}
        {active && <button className="chip" onClick={() => p.setWeights(ZERO_WEIGHTS)}>Reset</button>}
      </div>

      <h3>Your office</h3>
      <div className="row wrap">
        <select
          value={OFFICES.find((o) => o.name === p.office?.name)?.id ?? (p.office ? "custom" : "")}
          onChange={(e) => {
            const o = OFFICES.find((x) => x.id === e.target.value);
            p.setOffice(o ? { name: o.name, lat: o.lat, lng: o.lng } : null);
          }}
        >
          <option value="">No office selected</option>
          {OFFICES.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          {p.office && !OFFICES.some((o) => o.name === p.office?.name) && <option value="custom">{p.office.name}</option>}
        </select>
        <button className={`btn small ${p.pickingOffice ? "" : "ghost"}`} onClick={() => p.setPickingOffice(!p.pickingOffice)}>
          {p.pickingOffice ? "Tap the map…" : "📍 Pick on map"}
        </button>
      </div>

      <h3>Max 2BHK budget</h3>
      <div className="slider-row">
        <input type="range" min={0} max={100} step={5} value={p.budget} onChange={(e) => p.setBudget(+e.target.value)} />
        <b>{p.budget ? `₹${p.budget}k` : "Any"}</b>
      </div>

      <h3>Priorities</h3>
      <ul className="sliders">
        {PRIORITIES.map((pr) => (
          <li key={pr.key}>
            <span>{pr.icon} {pr.label}</span>
            <input type="range" min={0} max={5} value={p.weights[pr.key]}
              disabled={pr.key === "commute" && !p.office}
              onChange={(e) => p.setWeights({ ...p.weights, [pr.key]: +e.target.value })} />
            <b>{p.weights[pr.key]}</b>
          </li>
        ))}
      </ul>
      {!p.office && <p className="note">Pick an office to use the commute slider.</p>}

      <h3>{active ? "Best matches" : "Set a priority to see matches"}</h3>
      {active && (
        <ol className="ranked">
          {ranked.map(({ s, m }) => (
            <li key={s.id} onClick={() => p.onSelect(s.id)}>
              <span>{s.name}<small className="muted"> · {s.zone}</small></span>
              <b>{m}%</b>
            </li>
          ))}
          {ranked.length === 0 && <li className="muted">Nothing fits that budget. Try raising it.</li>}
        </ol>
      )}
    </div>
  );
}
