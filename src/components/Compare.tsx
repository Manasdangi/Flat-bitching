import { SECTORS, sectorById } from "../data/sectors";
import { allScores, commute, matchScore, nearby, nearestMetro, PRIORITIES, type Office, type Weights } from "../lib/score";
import { Bar } from "./SectorPanel";
import { womenMode } from "../lib/store";
import { nightHome, womenScore } from "../lib/women";
import { shortlist } from "../lib/store";

type Props = {
  ids: string[];
  setIds: (ids: string[]) => void;
  weights: Weights;
  office: Office;
  onSelect: (id: string) => void;
};

export default function Compare({ ids, setIds, weights, office, onSelect }: Props) {
  const women = womenMode.use();
  const list = ids.map(sectorById).filter(Boolean) as NonNullable<ReturnType<typeof sectorById>>[];
  const add = (id: string) => id && !ids.includes(id) && ids.length < 3 && setIds([...ids, id]);
  const saved = shortlist.use().filter((x) => x.kind === "sector").map((x) => x.id).filter((id) => !ids.includes(id));
  const topMatches = Object.values(weights).some(Boolean)
    ? SECTORS.map((s) => ({ s, m: matchScore(s, weights, office) ?? 0 })).sort((a, b) => b.m - a.m).slice(0, 3).map((x) => x.s).filter((s) => !ids.includes(s.id))
    : [];
  /** Cell class: marks the best value in a row so the answer is visible without reading every number. */
  const best = (vals: (number | null)[], higher: boolean) => {
    const nums = vals.filter((v): v is number => v != null);
    if (list.length < 2 || nums.length < 2 || Math.max(...nums) === Math.min(...nums)) return vals.map(() => "");
    const b = higher ? Math.max(...nums) : Math.min(...nums);
    return vals.map((v) => (v === b ? "best" : ""));
  };
  const rent = best(list.map((s) => (s.rent2bhk[0] + s.rent2bhk[1]) / 2), false);
  const metroKm = best(list.map((s) => nearestMetro(s).km), false);
  const matchBest = best(list.map((s) => matchScore(s, weights, office)), true);
  const womenBest = best(list.map((s) => womenScore(s)), true);
  const commuteBest = best(list.map((s) => (office ? commute(s, office)?.minutes ?? null : null)), false);
  const summary = list.length >= 2 ? [
    rent.includes("best") ? `${list[rent.indexOf("best")].name} is the cheapest` : "",
    metroKm.includes("best") ? `${list[metroKm.indexOf("best")].name} is closest to a metro` : "",
    women && womenBest.includes("best") ? `${list[womenBest.indexOf("best")].name} has the best women's score` : "",
    office && commuteBest.includes("best") ? `${list[commuteBest.indexOf("best")].name} has the shortest commute` : "",
  ].filter(Boolean) : [];

  return (
    <div className="panel-body">
      <h2>Compare sectors</h2>
      <p className="muted">Add up to 3 sectors, either here or with “+ Compare” on a sector. The best value in each row is highlighted.</p>
      {list.length < 3 && (topMatches.length > 0 || saved.length > 0) && (
        <div className="chips">
          {topMatches.length > 0 && <button className="chip" onClick={() => setIds([...ids, ...topMatches.map((s) => s.id)].slice(0, 3))}>✨ Add my top {topMatches.length} matches</button>}
          {saved.length > 0 && <button className="chip" onClick={() => setIds([...ids, ...saved].slice(0, 3))}>♥ Add from saved</button>}
        </div>
      )}
      {summary.length > 0 && <ul className="compare-summary">{summary.map((x) => <li key={x}>{x}</li>)}</ul>}
      {ids.length < 3 && (
        <select value="" onChange={(e) => add(e.target.value)}>
          <option value="">+ Add a sector…</option>
          {SECTORS.filter((s) => !ids.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {list.length > 0 && (
        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th />
                {list.map((s) => (
                  <th key={s.id}>
                    <button className="link" onClick={() => onSelect(s.id)}>{s.name}</button>
                    <button className="icon-btn" aria-label="Remove" onClick={() => setIds(ids.filter((x) => x !== s.id))}>✕</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(weights).some(Boolean) && (
                <tr><td>Your match</td>{list.map((s, i) => <td key={s.id} className={matchBest[i]}><b>{matchScore(s, weights, office)}%</b></td>)}</tr>
              )}
              {women && <tr><td>👩 Women's score</td>{list.map((s, i) => <td key={s.id} className={womenBest[i]}><b>{womenScore(s)}</b>/100</td>)}</tr>}
              {women && <tr><td>🌙 Getting home</td>{list.map((s) => <td key={s.id}>{nightHome(s).label}</td>)}</tr>}
              <tr><td>2BHK rent</td>{list.map((s, i) => <td key={s.id} className={rent[i]}>₹{s.rent2bhk[0]}–{s.rent2bhk[1]}k</td>)}</tr>
              <tr><td>PG</td>{list.map((s) => <td key={s.id}>₹{s.pgRent[0]}–{s.pgRent[1]}k · {s.pg}</td>)}</tr>
              <tr><td>Metro</td>{list.map((s, i) => { const m = nearestMetro(s); return <td key={s.id} className={metroKm[i]}>{m.station.name}<br /><small>{m.km.toFixed(1)} km</small></td>; })}</tr>
              <tr><td>Nearest tech hub</td>{list.map((s) => { const h = nearby(s, "tech", 1, 99)[0]; return <td key={s.id}>{h ? <>{h.name}<br /><small>{h.km.toFixed(1)} km</small></> : "–"}</td>; })}</tr>
              <tr><td>Nearest hospital</td>{list.map((s) => { const h = nearby(s, "hospital", 1, 99)[0]; return <td key={s.id}>{h ? <>{h.name}<br /><small>{h.km.toFixed(1)} km</small></> : "–"}</td>; })}</tr>
              {office && <tr><td>Commute</td>{list.map((s, i) => <td key={s.id} className={commuteBest[i]}>~{commute(s, office)!.minutes} min</td>)}</tr>}
              {PRIORITIES.filter((p) => p.key !== "commute" || office).map((p) => (
                <tr key={p.key}><td>{p.icon} {p.label}</td>{list.map((s) => <td key={s.id}><Bar v={allScores(s, office)[p.key]} /></td>)}</tr>
              ))}
              <tr><td>Societies</td>{list.map((s) => <td key={s.id}><small>{s.societies.join(", ")}</small></td>)}</tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
