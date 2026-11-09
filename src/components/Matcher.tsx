import { useState } from "react";
import { OFFICES, SECTORS } from "../data/sectors";
import { PRESETS } from "../lib/presets";
import { allScores, commute, matchScore, PRIORITIES, ZERO_WEIGHTS, type Office, type Weights } from "../lib/score";
import type { Sector } from "../data/sectors";
import { money } from "../lib/store";
import { linkProps } from "../lib/router";
import { track } from "../lib/track";

type Props = {
  weights: Weights;
  setWeights: (w: Weights) => void;
  office: Office;
  setOffice: (o: Office) => void;
  office2: Office;
  setOffice2: (o: Office) => void;
  office3: Office;
  setOffice3: (o: Office) => void;
  pickingOffice: 0 | 1 | 2 | 3;
  setPickingOffice: (v: 0 | 1 | 2 | 3) => void;
  budget: number;
  setBudget: (n: number) => void;
  onSelect: (id: string) => void;
  compareIds: string[];
  setCompare: (ids: string[]) => void;
};

/** One-line reasons a sector ranks well: the user's top priorities with this sector's score, plus rent. */
function reasons(s: Sector, w: Weights, office: Office) {
  const sc = allScores(s, office);
  return PRIORITIES.filter((x) => w[x.key] > 0 && sc[x.key] != null)
    .sort((a, b) => w[b.key] - w[a.key] || (sc[b.key] ?? 0) - (sc[a.key] ?? 0))
    .slice(0, 3)
    .map((x) => ({ key: x.key, text: `${x.icon} ${x.label} ${Math.round((sc[x.key] ?? 0) * 10) / 10}/5`, good: (sc[x.key] ?? 0) >= 3.5 }));
}

function CompareBtn({ id, ids, set }: { id: string; ids: string[]; set: (ids: string[]) => void }) {
  const on = ids.includes(id);
  return (
    <button className={`btn small ${on ? "" : "ghost"}`} aria-pressed={on}
      onClick={(e) => { e.stopPropagation(); set(on ? ids.filter((x) => x !== id) : [...ids, id].slice(-3)); track("compare_toggle", { from: "match" }); }}>
      {on ? "✓ Comparing" : "+ Compare"}
    </button>
  );
}

function OfficePicker({ value, onChange, picking, onPick, label }: {
  value: Office; onChange: (o: Office) => void; picking: boolean; onPick: () => void; label: string;
}) {
  return (
    <div className="row office-pick">
      <select aria-label={label}
        value={OFFICES.find((o) => o.name === value?.name)?.id ?? (value ? "custom" : "")}
        onChange={(e) => {
          const o = OFFICES.find((x) => x.id === e.target.value);
          onChange(o ? { name: o.name, lat: o.lat, lng: o.lng } : null);
          if (o) track("office_set", { hub: o.name });
        }}
      >
        <option value="">{label}</option>
        {OFFICES.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        {value && !OFFICES.some((o) => o.name === value.name) && <option value="custom">{value.name}</option>}
      </select>
      <button className={`btn small ${picking ? "" : "ghost"}`} onClick={onPick}>{picking ? "Tap the map…" : "📍 Pick on map"}</button>
    </div>
  );
}

export default function Matcher(p: Props) {
  const { salary, people } = money.use();
  const [showSalary, setShowSalary] = useState(false);
  const [showSecond, setShowSecond] = useState(Boolean(p.office2));
  const [showThird, setShowThird] = useState(Boolean(p.office3));
  const offices = [p.office, p.office2, p.office3].filter(Boolean) as NonNullable<Office>[];
  // With two or three offices pinned: rank sectors by the longest of the commutes (so nobody gets a terrible one), then by the average.
  // With two or three offices pinned: blend how short the longest commute is (so nobody gets a terrible one) with the user's other priorities.
  const otherW = { ...p.weights, commute: 0 };
  const hasOther = Object.values(otherW).some(Boolean);
  const bestForOffices = offices.length >= 1 || hasOther
    ? SECTORS.filter((s) => !p.budget || s.rent2bhk[0] <= p.budget)
        .map((s) => {
          const mins = offices.map((o) => commute(s, o)?.minutes ?? 0);
          const worst = mins.length ? Math.max(...mins) : 0;
          const avg = mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : 0;
          const commuteScore = mins.length ? Math.max(0, Math.min(100, 100 - ((worst - 15) / 45) * 100)) : 0;
          const other = hasOther ? matchScore(s, otherW, null) ?? 0 : 0;
          const total = !mins.length ? other : hasOther ? (p.weights.commute ? 0.5 : 0.25) * commuteScore + (p.weights.commute ? 0.5 : 0.75) * other : commuteScore;
          return { s, mins, worst, avg, total };
        })
        .sort((a, b) => b.total - a.total || a.worst - b.worst).slice(0, 8)
    : [];
  const active = Object.values(p.weights).some(Boolean);
  const salaryBudget = salary ? Math.round((salary * 0.3 * Math.max(1, people)) / 1000 / 5) * 5 : 0;

  return (
    <div className="panel-body">
      <h2>What matters to you?</h2>
      <p className="muted">Pick one or more profiles, or set each priority from 0 to 5. The map colours each sector by how well it matches.</p>

      <div className="chips">
        {PRESETS.map((pr) => {
          // A preset is "on" when every priority it sets is at least that high. Several can be on at once: the highest value per priority wins.
          const isOn = (x: typeof pr) => Object.entries(x.w).every(([k, v]) => (p.weights[k as keyof Weights] ?? 0) >= (v ?? 0));
          const on = isOn(pr);
          return (
            <button key={pr.label} className={`chip${on ? " on" : ""}`} aria-pressed={on}
              onClick={() => {
                const rest = PRESETS.filter((x) => x.label !== pr.label && isOn(x));
                const picked = on ? rest : [...rest, pr];
                const w: Weights = { ...ZERO_WEIGHTS };
                for (const x of picked) for (const [k, v] of Object.entries(x.w)) w[k as keyof Weights] = Math.max(w[k as keyof Weights] ?? 0, v ?? 0);
                p.setWeights(w);
                if (!on) track("preset", { name: pr.label });
              }}>
              {on ? "✓ " : ""}{pr.label}
            </button>
          );
        })}
        {active && <button className="chip" onClick={() => p.setWeights(ZERO_WEIGHTS)}>Reset</button>}
      </div>

      <h3>Your office</h3>
      <OfficePicker value={p.office} onChange={p.setOffice} label="No office selected"
        picking={p.pickingOffice === 1} onPick={() => p.setPickingOffice(p.pickingOffice === 1 ? 0 : 1)} />
      {!showSecond ? (
        <button className="link small-txt add-second" onClick={() => setShowSecond(true)} disabled={!p.office}>
          + Add a second office (partner or flatmate)
        </button>
      ) : (
        <>
          <h3>Second office <button className="link small-txt" onClick={() => { p.setOffice2(null); setShowSecond(false); }}>remove</button></h3>
          <OfficePicker value={p.office2} onChange={p.setOffice2} label="Partner / flatmate office"
            picking={p.pickingOffice === 2} onPick={() => p.setPickingOffice(p.pickingOffice === 2 ? 0 : 2)} />
          {p.office && p.office2 && <p className="muted small-txt">The commute score now uses whichever drive is longest, so the match is fair for everyone.</p>}
        </>
      )}
      {showSecond && !showThird && (
        <button className="link small-txt add-second" onClick={() => setShowThird(true)} disabled={!p.office2}>+ Add a third office</button>
      )}
      {showThird && (
        <>
          <h3>Third office <button className="link small-txt" onClick={() => { p.setOffice3(null); setShowThird(false); }}>remove</button></h3>
          <OfficePicker value={p.office3} onChange={p.setOffice3} label="Third office"
            picking={p.pickingOffice === 3} onPick={() => p.setPickingOffice(p.pickingOffice === 3 ? 0 : 3)} />
        </>
      )}

      <h3>Max 2BHK budget</h3>
      <div className="slider-row">
        <input type="range" min={0} max={100} step={5} value={p.budget} onChange={(e) => p.setBudget(+e.target.value)} />
        <b>{p.budget ? `₹${p.budget}k` : "Any"}</b>
      </div>
      {!showSalary ? (
        <button className="link small-txt" onClick={() => setShowSalary(true)}>Work out my budget from salary</button>
      ) : (
        <div className="salary-box">
          <div className="calc-grid">
            <label>Monthly in-hand salary
              <input type="number" inputMode="numeric" min={0} step={5000} placeholder="e.g. 120000" value={salary || ""}
                onChange={(e) => money.set((m) => ({ ...m, salary: Math.max(0, +e.target.value || 0) }))} />
            </label>
            <label>Earners sharing rent
              <select value={people} onChange={(e) => money.set((m) => ({ ...m, people: +e.target.value }))}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          {salaryBudget > 0 && (
            <p className="small-txt">30% of {people > 1 ? "combined " : ""}salary ≈ <b>₹{salaryBudget}k</b> for rent.{" "}
              <button className="link" onClick={() => { p.setBudget(Math.min(100, salaryBudget)); track("budget_from_salary"); }}>Use this budget</button>
            </p>
          )}
          <small className="muted">Stays on this device. Assumes everyone earns about the same.</small>
        </div>
      )}

      <details className="fine-tune">
        <summary>Fine-tune priorities{active ? ` (${Object.values(p.weights).filter(Boolean).length} set)` : ""}</summary>
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
      </details>

      {bestForOffices.length === 0 && (
        <p className="note">{offices.length || hasOther ? "Nothing fits that budget. Try raising it." : "Pick a profile, an office or a priority above to see matching sectors here."}</p>
      )}
      {bestForOffices.length > 0 && (
        <>
          <h3>{offices.length > 1 ? `Best sectors for your ${offices.length} offices` : "Best sectors for you"}</h3>
          <p className="muted small-txt">{offices.length > 1 ? "Ranked by your priorities and budget, plus the longest peak-hour drive so nobody has a terrible commute. " : "Ranked by your priorities, budget and drive to your office. "}Drive times are estimates.</p>
          <ol className="ranked">
            {bestForOffices.map(({ s, mins, total }) => (
              <li key={s.id} onClick={() => p.onSelect(s.id)}>
                <span>{s.name}<small className="muted">{s.zone}</small><small className="muted">2BHK ₹{s.rent2bhk[0]}–{s.rent2bhk[1]}k/mo</small>
                  {mins.length > 0 && <small className="muted commute-line">🚗 {mins.join(" / ")} min at peak</small>}
                  {hasOther && <small className="why">{reasons(s, otherW, p.office).map((r) => <em key={r.key} className={r.good ? "ok" : ""}>{r.text}</em>)}</small>}</span>
                <span className="row-end"><b>{Math.round(total)}%</b><CompareBtn id={s.id} ids={p.compareIds} set={p.setCompare} /></span>
              </li>
            ))}
          </ol>
          {p.compareIds.length >= 2 && <a className="btn small" {...linkProps("/compare")}>Compare {p.compareIds.length} sectors →</a>}
        </>
      )}

    </div>
  );
}
