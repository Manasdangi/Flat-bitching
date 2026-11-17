import { useEffect, useState } from "react";
import { sectorById } from "../data/sectors";
import { goBack, linkProps } from "../lib/router";
import { allScores, commute, matchScore, nearby, nearestMetro, PRIORITIES, type Office, type Weights, COMMUNITY_MIN_VOTES, communityFor } from "../lib/score";
import { isNamedSociety, slugify } from "../lib/societies";
import { AqiBadge, SuggestFix } from "./Extras";
import DataTrust from "./DataTrust";
import { stationsFor } from "../data/police";
import { track } from "../lib/track";
import Reviews from "./Reviews";
import { SaveButton } from "./Shortlist";
import { FLOOD, FLOOD_SOURCE, WATER, WATER_SOURCE } from "../data/risk";
import { FLOOD_EV, SRC, WATER_EV } from "../data/evidence";
import { RentReports, ResidentPolls } from "./ResidentData";
import WomenSnapshot from "./WomenSnapshot";
import { AskOwner, NightAndCost, PgScorecard } from "./WomenTools";
import { womenMode, bhkPref, type Bhk } from "../lib/store";
import { BHK_TXT, rentRange, isEstimate } from "../lib/rent";
import { RENT_CHECK_3BHK } from "../data/evidence";
import { ToolGroup } from "./Tool";
import Checklist from "./Checklist";
import RentCheck from "./RentCheck";
import VisitPlanner from "./VisitPlanner";
import { badgesFor } from "../lib/presets";
import { confidence } from "../lib/confidence";

type Props = {
  id: string;
  weights: Weights;
  office: Office;
  office2: Office;
  office3?: Office;
  onClose: () => void;
  inCompare: boolean;
  onToggleCompare: () => void;
  budget?: number;
};

export const Bar = ({ v }: { v: number | null }) => (
  <span className="bar" aria-label={v == null ? "n/a" : `${Math.round(v * 10) / 10} of 5`}>
    {v == null ? <span className="muted">n/a</span> : <span className="fill" style={{ width: `${(v / 5) * 100}%` }} />}
  </span>
);

const rupees = ([a, b]: [number, number]) => `₹${a}k – ₹${b}k`;

type Tab = "overview" | "women" | "water" | "community";

export default function SectorPanel({ id, weights, office, office2, office3, onClose, inCompare, onToggleCompare, budget = 0 }: Props) {
  const women = womenMode.use();
  const bhk: Bhk = bhkPref.use() === "3bhk" ? "3bhk" : "2bhk";
  const [tab, setTab] = useState<Tab>("overview");
  const [showCf, setShowCf] = useState(false);
  useEffect(() => { setTab("overview"); setShowCf(false); }, [id]);
  const s = sectorById(id);
  if (!s) return <div className="panel-body"><h2>Sector not found</h2><p>We don't cover this one yet.</p></div>;
  const metro = nearestMetro(s);
  const c = commute(s, office);
  const c2 = commute(s, office2);
  const c3 = commute(s, office3 ?? null);
  const badges = badgesFor(s.id);
  const sc = allScores(s, office, bhk);
  const m = matchScore(s, weights, office, bhk);
  const range = rentRange(s, bhk);
  const listed = bhk === "3bhk" ? RENT_CHECK_3BHK[s.id] : undefined;
  const named = s.societies.filter(isNamedSociety);

  const share = async () => {
    const url = location.origin + `/sector/${s.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${s.name} – Gurgaon Flat Finder`, url });
      else await navigator.clipboard?.writeText(url);
    } catch { /* cancelled */ }
  };

  const cf = confidence(s.id);
  const policeLink = (() => {
    const near = stationsFor(s).stations[0];
    if (!near) return null;
    const lp = linkProps(`/police/${s.id}`);
    return (
      <a className="police-link" href={lp.href} onClick={(e) => { track("police_card", { sector: s.id }); lp.onClick(e); }}>
        <span className="pl-ico">🚓</span>
        <span><b>Police stations & helpline</b><small>Nearest: {near.station.name}. Address, phone, email ›</small></span>
      </a>
    );
  })();
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    ...(women ? [{ key: "women" as Tab, label: "👩 Women" }] : []),
    { key: "water", label: "🌧️ Water" },
    { key: "community", label: "💬 Community" },
  ];
  const active: Tab = tabs.some((t) => t.key === tab) ? tab : "overview";

  return (
    <article className="panel-body">
      <div className="row between">
        <div className="row">
          <button className="icon-btn head-back" onClick={() => goBack("/")} aria-label="Back">←</button>
          <div>
            <p className="eyebrow">{s.zone}</p>
            <h2>{s.name}</h2>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      {badges.length > 0 && (
        <div className="chips badges">{badges.map((b) => <span key={b} className="chip badge">🏆 Top pick: {b}</span>)}</div>
      )}
      <div className="chip-row">
        {m != null && <span className="chip match-chip">Your match: <b>{m}%</b></span>}
        <button type="button" className={`chip cf-chip ${cf.level.toLowerCase()}`} aria-expanded={showCf} onClick={() => setShowCf((v) => !v)}>📊 {cf.level} confidence ⓘ</button>
        <AqiBadge lat={s.lat} lng={s.lng} />
      </div>
      {showCf && <p className="note">{cf.why}. <a className="link" {...linkProps("/data")}>How reliable is this?</a></p>}
      <p>{s.summary}</p>

      <div className="actions">
        <SaveButton kind="sector" id={s.id} />
        <button className={`btn small ${inCompare ? "ghost" : ""}`} onClick={onToggleCompare}>
          {inCompare ? "✓ In compare" : "+ Compare"}
        </button>
        <button className="btn small ghost" onClick={share}>Share</button>
      </div>

      <div className="bhk-pick" role="group" aria-label="Home size">
        <span>Rent for</span>
        <div className="bhk-seg">
          {(["2bhk", "3bhk"] as Bhk[]).map((k) => (
            <button key={k} type="button" aria-pressed={bhk === k} className={bhk === k ? "on" : ""}
              onClick={() => { if (k !== bhk) { bhkPref.set(k); track("bhk_pick", { sector: s.id, bhk: k }); } }}>{BHK_TXT[k]}</button>
          ))}
        </div>
      </div>
      <div className="facts">
        <div><span>{BHK_TXT[bhk]} rent{isEstimate(bhk) && !listed ? " (est.)" : ""}</span><b>{rupees(range)}</b>
          {bhk === "3bhk" && <small className="muted">{listed ? `Listings: typical ₹${listed.median}k` : "Estimated from 2 BHK"}</small>}
        </div>
        <div><span>PG (single)</span><b>{rupees(s.pgRent)}</b></div>
        <div><span>PG availability</span><b>{s.pg}</b></div>
        <div><span>Nearest metro</span><b>{metro.station.name} · {metro.km.toFixed(1)} km</b></div>
        {c && office && (
          <div className="wide">
            <span>Drive to {office.name}</span>
            <b>{c.roadKm.toFixed(1)} km · ~{c.minutes} min at peak{c.offpeak != null && <> · {c.offpeak} min off-peak</>}</b>
            {c2 && office2 && <b className="second">{c2.roadKm.toFixed(1)} km · ~{c2.minutes} min at peak to {office2.name}</b>}
            {c3 && office3 && <b className="second">{c3.roadKm.toFixed(1)} km · ~{c3.minutes} min at peak to {office3.name}</b>}
            <small className="muted">{c.real ? "Road route via OpenStreetMap; peak time estimated" : office.name.includes("pinned") ? "Rough estimate for a pinned location" : "Rough estimate (route data loading or unavailable)"}</small>
          </div>
        )}
      </div>

      {budget > 0 && (
        <p className={`budget-line ${range[0] <= budget ? "ok" : "over"}`}>
          {range[1] <= budget ? `✓ ${BHK_TXT[bhk]} fits your ₹${budget}k budget` : range[0] <= budget ? `~ Some ${BHK_TXT[bhk]}s fit your ₹${budget}k budget (rents start at ₹${range[0]}k)` : `✕ Above your ₹${budget}k budget (${BHK_TXT[bhk]} starts at ₹${range[0]}k)`}
        </p>
      )}
      <div className="inshort">
        <p><b>👍 Good:</b> {s.highlights.slice(0, 2).join(" · ")}</p>
        <p><b>⚠️ Watch out:</b> {s.watchOut.slice(0, 2).join(" · ")}</p>
      </div>

      <div className="sector-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={active === t.key} className={active === t.key ? "on" : ""} onClick={() => { setTab(t.key); track("sector_tab", { sector: s.id, tab: t.key }); }}>{t.label}</button>
        ))}
      </div>

      {active === "overview" && (
        <>
          <h3>Scores</h3>
          <ul className="scores">
            {PRIORITIES.map((p) => (
              <li key={p.key}><span>{p.icon} {p.label}{(() => { const c = communityFor(s.id)?.[p.key]; return c && c.n >= COMMUNITY_MIN_VOTES ? <small className="muted"> · {c.n} resident votes</small> : null; })()}</span><Bar v={sc[p.key]} /></li>
            ))}
          </ul>
          {!office && <p className="muted small-txt">Pick your office in the Match tab to see real drive times.</p>}

          <details className="tool">
            <summary>👍 All pros and cons</summary>
            <div className="two-col">
              <div><h3>👍 Good</h3><ul>{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul></div>
              <div><h3>⚠️ Watch out</h3><ul>{s.watchOut.map((h) => <li key={h}>{h}</li>)}</ul></div>
            </div>
          </details>
          <details className="tool">
            <summary>📍 Nearby places</summary>
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
          </details>

          <h3>Popular societies & housing</h3>
          <div className="chips">
            {s.societies.map((x) => isNamedSociety(x)
              ? <a key={x} className="chip link-chip" {...linkProps(`/society/${slugify(x)}`)}>🏢 {x} ›</a>
              : <span key={x} className="chip">{x}</span>)}
          </div>

          {!women && policeLink}

          <div className="listing-links">
            <h3>Ready to look? See live listings</h3>
            <div className="chips">
              {[["NoBroker", "nobroker.in"], ["99acres", "99acres.com"], ["MagicBricks", "magicbricks.com"]].map(([n, d]) => (
                <a key={n} className="chip link-chip" target="_blank" rel="noopener noreferrer" onClick={() => track("listing_link", { sector: s.id, site: n })}
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${BHK_TXT[bhk]} flat for rent ${s.name} Gurgaon site:${d}`)}`}>🏠 {n} ›</a>
              ))}
            </div>
            <small className="muted">Opens a search on those sites. Always check the listing in person; never pay a deposit before visiting.</small>
          </div>

          <div className="tools">
            <RentCheck sector={s} bhk={bhk} />
            <ToolGroup title="📅 Plan a visit + checklist">
              <VisitPlanner sector={s} />
              <Checklist sectorId={s.id} />
            </ToolGroup>
          </div>
        </>
      )}

      {active === "women" && women && (
        <>
          <WomenSnapshot sector={s} />
          <NightAndCost sector={s} office={office} bhk={bhk} />
          {policeLink}
          <div className="tools">
            <ToolGroup title="🛏️ PG & owner questions">
              <PgScorecard sectorId={s.id} />
              <AskOwner sector={s} />
            </ToolGroup>
          </div>
        </>
      )}

      {active === "water" && <RiskCard id={s.id} />}

      {active === "community" && (
        <>
          <div className="rate-cta">
            <div><b>Live here? Rate {s.name} in 30 seconds</b><small className="muted">One tap each, anonymous. It makes the data more reliable for everyone.</small></div>
            <a className="btn small" {...linkProps(`/rate?sector=${s.id}`)}>Rate it</a>
            <a className="link small-txt" target="_blank" rel="noopener noreferrer" onClick={() => track("ask_residents", { sector: s.id })}
              href={`https://wa.me/?text=${encodeURIComponent(`Do you live in ${s.name}, Gurgaon? Rate it in 30 seconds so others can choose safely: ${location.origin}/sector/${s.id}`)}`}>Ask a friend here (WhatsApp)</a>
          </div>
          <RentReports sector={s} bhk={bhk} />
          <ResidentPolls sectorId={s.id} />
          <Reviews sectorId={s.id} societies={named} />
        </>
      )}

      <details className="tool about-data">
        <summary>ℹ️ About this data</summary>
        <DataTrust sectorId={s.id} />
        <p className="note">
          Sector outlines and drive times come from OpenStreetMap. Rents are rough ranges from 2025–26 listings (3 BHK ranges are estimated from 2 BHK unless a listing figure is shown), nearby places are straight-line
          distances, and scores are editorial estimates until enough residents rate them. Visit at night and in monsoon before renting.
        </p>
        <SuggestFix sectorId={s.id} />
      </details>
    </article>
  );
}

function RiskCard({ id }: { id: string }) {
  const f = FLOOD[id], w = WATER[id];
  const more = [...(FLOOD_EV[id] ?? []).map((e) => ({ ...e, topic: "☔" })), ...(WATER_EV[id] ?? []).map((e) => ({ ...e, topic: "🚰" }))];
  const conflict = Boolean(w) && (WATER_EV[id] ?? []).some((e) => e.tone === "good");
  return (
    <div className={`risk ${f || w ? "has" : ""}`}>
      <h3>🌧️ Water &amp; flood check</h3>
      {w && <p>🚰 <b>{w.score === 1 ? "Severe water shortage reported." : "Water shortages reported."}</b> {w.note} <small className="muted">Ask the society about tanker costs before you sign.</small></p>}
      {f && <p>☔ <b>{f.level === "high" ? "High waterlogging risk." : "Waterlogging risk."}</b> {f.note} <small className="muted">Avoid basement or ground-floor flats here, and check for a stilt or pump.</small></p>}
      {conflict && <p className="note">⚖️ <b>Sources disagree on water here.</b> Residents and news reports describe shortages, while a real-estate portal lists it as good. Ask the society directly before you decide.</p>}
      {more.length > 0 && (
        <ul className="more-reports">
          {more.map((e, i) => <li key={i}>{e.topic} {e.note} <a className="link" href={SRC[e.src].url} target="_blank" rel="noreferrer">{SRC[e.src].label}</a></li>)}
        </ul>
      )}
      {!f && !w && <p className="muted">No water or flooding problems reported for this sector in the sources we checked. That is not a guarantee, so ask current residents.</p>}
      <small className="muted">Sources: <a href={WATER_SOURCE.url} target="_blank" rel="noreferrer">{WATER_SOURCE.label}</a>, <a href={FLOOD_SOURCE.url} target="_blank" rel="noreferrer">{FLOOD_SOURCE.label}</a>. Reports, not official data. </small>
    </div>
  );
}
