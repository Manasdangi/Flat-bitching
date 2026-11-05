import { useState } from "react";
import { linkProps } from "../lib/router";
import { nightHome, rankedForWomen, livingCosts } from "../lib/women";

/** Safest sectors for women, ranked, with filters for budget, PG and metro. */
export default function WomenBest({ onSelect }: { onSelect: (id: string) => void }) {
  const [pgOnly, setPgOnly] = useState(false);
  const [metro, setMetro] = useState(false);
  const [budget, setBudget] = useState(0);
  const [f, setF] = useState({ noFlood: false, noWater: false, lively: false, safe4: false });
  const flip = (k: keyof typeof f) => setF({ ...f, [k]: !f[k] });
  const list = rankedForWomen({ budget, pgOnly, metro, ...f }).slice(0, 15);
  return (
    <div className="panel-body">
      <p className="eyebrow">For women</p>
      <h2>Best sectors for women</h2>
      <p className="muted">Ranked on night safety, nearby markets, cleanliness, flooding and metro distance. Scores are editorial estimates, so visit at night before you decide.</p>
      <div className="chips">
        <button className={`chip${!pgOnly ? " on" : ""}`} aria-pressed={!pgOnly} onClick={() => setPgOnly(false)}>🏠 Flats</button>
        <button className={`chip${pgOnly ? " on" : ""}`} aria-pressed={pgOnly} onClick={() => setPgOnly(true)}>🛏️ PG</button>
        <button className={`chip${metro ? " on" : ""}`} aria-pressed={metro} onClick={() => setMetro(!metro)}>🚇 Metro within 2 km</button>
      </div>
      <h3>My dealbreakers</h3>
      <div className="chips">
        {([["safe4", "🛡️ Safety 4+ only"], ["lively", "🌃 Busy and open late"], ["noFlood", "☔ No waterlogging"], ["noWater", "🚰 No water shortage"]] as const).map(([k, label]) => (
          <button key={k} className={`chip${f[k] ? " on" : ""}`} aria-pressed={f[k]} onClick={() => flip(k)}>{f[k] ? "✓ " : ""}{label}</button>
        ))}
      </div>
      <h3>{pgOnly ? "Max PG rent (single room)" : "Max 2BHK rent"}</h3>
      <div className="slider-row">
        <input type="range" min={0} max={pgOnly ? 30 : 100} step={pgOnly ? 1 : 5} value={budget} onChange={(e) => setBudget(+e.target.value)} />
        <b>{budget ? `₹${budget}k` : "Any"}</b>
      </div>
      {list.length === 0 ? <p className="muted">No sectors match. Loosen a filter.</p> : (
        <ol className="ranked">
          {list.map(({ s, w }) => {
            const n = nightHome(s), c = livingCosts(s);
            return (
              <li key={s.id} onClick={() => onSelect(s.id)}>
                <span>{s.name}<small className="muted"> · {s.zone}</small>
                  <small className="muted commute-line">🌙 Getting home: {n.label} · {pgOnly ? `PG about ₹${c.pg}k` : `2BHK ₹${s.rent2bhk[0]}–${s.rent2bhk[1]}k`}</small></span>
                <b>{w}</b>
              </li>
            );
          })}
        </ol>
      )}
      <p className="muted small-txt">The number is a 0–100 women's score. Tap a sector for resident votes, reviews and the full safety snapshot.</p>
      <p><a className="btn small ghost" {...linkProps("/women")}>Women's renting guide →</a></p>
    </div>
  );
}
