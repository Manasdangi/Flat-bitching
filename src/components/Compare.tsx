import { SECTORS, sectorById } from "../data/sectors";
import { allScores, commute, matchScore, nearby, nearestMetro, PRIORITIES, type Office, type Weights } from "../lib/score";
import { Bar } from "./SectorPanel";
import { womenMode } from "../lib/store";
import { nightHome, womenScore } from "../lib/women";

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

  return (
    <div className="panel-body">
      <h2>Compare sectors</h2>
      <p className="muted">Add up to 3 sectors, either here or with “+ Compare” on a sector.</p>
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
                <tr><td>Your match</td>{list.map((s) => <td key={s.id}><b>{matchScore(s, weights, office)}%</b></td>)}</tr>
              )}
              {women && <tr><td>👩 Women's score</td>{list.map((s) => <td key={s.id}><b>{womenScore(s)}</b>/100</td>)}</tr>}
              {women && <tr><td>🌙 Getting home</td>{list.map((s) => <td key={s.id}>{nightHome(s).label}</td>)}</tr>}
              <tr><td>2BHK rent</td>{list.map((s) => <td key={s.id}>₹{s.rent2bhk[0]}–{s.rent2bhk[1]}k</td>)}</tr>
              <tr><td>PG</td>{list.map((s) => <td key={s.id}>₹{s.pgRent[0]}–{s.pgRent[1]}k · {s.pg}</td>)}</tr>
              <tr><td>Metro</td>{list.map((s) => { const m = nearestMetro(s); return <td key={s.id}>{m.station.name}<br /><small>{m.km.toFixed(1)} km</small></td>; })}</tr>
              <tr><td>Nearest tech hub</td>{list.map((s) => { const h = nearby(s, "tech", 1, 99)[0]; return <td key={s.id}>{h ? <>{h.name}<br /><small>{h.km.toFixed(1)} km</small></> : "–"}</td>; })}</tr>
              <tr><td>Nearest hospital</td>{list.map((s) => { const h = nearby(s, "hospital", 1, 99)[0]; return <td key={s.id}>{h ? <>{h.name}<br /><small>{h.km.toFixed(1)} km</small></> : "–"}</td>; })}</tr>
              {office && <tr><td>Commute</td>{list.map((s) => <td key={s.id}>~{commute(s, office)!.minutes} min</td>)}</tr>}
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
