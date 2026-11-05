import { useEffect, useState } from "react";
import type { Sector } from "../data/sectors";
import { loadPolls, communityEnabled, type PollCounts } from "../lib/community";
import { linkProps } from "../lib/router";
import { aspectAverages, listReviews, type Review } from "../lib/reviews";
import { allScores, nearby, nearestMetro } from "../lib/score";
import { SAFETY_EV, SRC } from "../data/evidence";

const pct = (c: { yes: number; sometimes: number; no: number } | undefined) => {
  const n = c ? c.yes + c.sometimes + c.no : 0;
  return n >= 3 && c ? { yes: Math.round((c.yes / n) * 100), n } : null;
};

/** Safety-first summary for a sector, built from editorial scores, resident polls and women reviewers. */
export default function WomenSnapshot({ sector }: { sector: Sector }) {
  const [polls, setPolls] = useState<PollCounts | null>(null);
  const [women, setWomen] = useState<Review[]>([]);
  useEffect(() => {
    let live = true;
    setPolls(null); setWomen([]);
    if (communityEnabled) {
      loadPolls(sector.id).then((c) => live && setPolls(c)).catch(() => {});
      listReviews({ sectorId: sector.id, limit: 100 }).then((r) => live && setWomen(r.filter((x) => x.tags.includes("Woman reviewer")))).catch(() => {});
    }
    return () => { live = false; };
  }, [sector.id]);

  const safety = allScores(sector, null).safety ?? sector.scores.safety;
  const metro = nearestMetro(sector);
  const hospital = nearby(sector, "hospital", 1, 99)[0];
  const night = pct(polls?.night_safe), lit = pct(polls?.lit_streets), cab = pct(polls?.late_cab), single = pct(polls?.single_friendly);
  const womenSafety = aspectAverages(women).find((a) => a.key === "r_safety")?.avg ?? null;
  const tone = safety >= 4 ? "good" : safety >= 3 ? "ok" : "low";

  return (
    <div className="women-card">
      <h3>👩 For women</h3>
      <div className={`women-score ${tone}`}>
        <b>{Math.round(safety * 10) / 10}/5</b>
        <span>{tone === "good" ? "Rated safer than most" : tone === "ok" ? "Average safety rating" : "Rated lower for safety, be extra careful here"}</span>
      </div>
      <ul className="women-list">
        {night && <li>🌙 <b>{night.yes}%</b> of residents say it feels safe to walk at 10pm <small className="muted">({night.n} votes)</small></li>}
        {lit && <li>🔦 <b>{lit.yes}%</b> say streets are well lit <small className="muted">({lit.n} votes)</small></li>}
        {cab && <li>🚕 <b>{cab.yes}%</b> say an auto or cab is easy to get after 9pm <small className="muted">({cab.n} votes)</small></li>}
        {single && <li>🏠 <b>{single.yes}%</b> say landlords and PGs accept single women <small className="muted">({single.n} votes)</small></li>}
        {women.length > 0 && <li>💬 {women.length} review{women.length > 1 ? "s" : ""} from women{womenSafety ? <>, average night safety <b>{Math.round(womenSafety * 10) / 10}/5</b></> : null}</li>}
        <li>🚇 Nearest metro: {metro.station.name}, {metro.km.toFixed(1)} km. <small className="muted">Check the last train time before relying on it late at night.</small></li>
        {hospital && <li>🏥 Nearest big hospital: {hospital.name}, {hospital.km.toFixed(1)} km</li>}
        <li>🛏️ PG availability: {sector.pg}</li>
      </ul>
      {(SAFETY_EV[sector.id] ?? []).map((e) => e.src === "police2024" ? (
        <p key={e.note} className="note">⚠️ Police named {e.note} here as an unsafe spot for women. <small>That is one spot, not the whole sector, and the list dates from 2024, so ask locally. <a className="link" href={SRC[e.src].url} target="_blank" rel="noreferrer">{SRC[e.src].label}</a></small></p>
      ) : (
        <p key={e.note} className="note">{e.tone === "info" ? "💬" : "⚠️"} {e.tone === "info" ? "Residents say" : "Reported"}: {e.note} <small>{e.src === "safetipinHubs" || e.src === "sqy56" ? "From a public audit or reviews, not our own data." : "One news report, not a pattern."} <a className="link" href={SRC[e.src].url} target="_blank" rel="noreferrer">{SRC[e.src].label}</a></small></p>
      ))}
      {!night && !lit && !cab && !single && women.length === 0 && (
        <p className="muted small-txt">No resident answers yet for this sector. Do you live here? <a className="link" {...linkProps(`/rate?sector=${sector.id}`)}>Rate it in 30 seconds</a>, or share that link with someone who does.</p>
      )}
      <p className="small-txt"><a className="link" {...linkProps("/women")}>Women's renting &amp; PG safety guide →</a></p>
    </div>
  );
}
