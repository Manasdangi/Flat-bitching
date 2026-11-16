import { sectorById } from "../data/sectors";
import { HELPLINES, OFFICIAL_SITE, STATIONS_UPDATED, stationsFor, type Near } from "../data/police";
import { goBack, linkProps } from "../lib/router";
import { track } from "../lib/track";

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;
const maps = (name: string, area: string) => `https://www.google.com/maps/search/${encodeURIComponent(`${name} police station ${area} Gurugram`)}`;

function Card({ n, label, sectorId, women }: { n: Near; label?: string; sectorId: string; women?: boolean }) {
  const s = n.station;
  const dist = n.km < 0.3 ? "in or next to this sector" : `about ${n.km.toFixed(1)} km from this sector`;
  return (
    <section className={`police-card${women ? " women" : ""}`}>
      <h3>{women ? "👩 " : "🚓 "}{s.name}{s.name.includes("Women") || s.name.includes("Metro") ? "" : " Police Station"}</h3>
      <p className="muted small-txt">{label ? `${label} · ` : ""}{s.zone} zone · {dist} (straight line)</p>
      <dl>
        <dt>Address</dt>
        <dd>{s.address ?? "Not in our list. Use the official site or Google Maps below."}</dd>
        <dt>Phone</dt>
        <dd>{s.phones.map((p) => <a key={p} className="btn small" href={tel(p)} onClick={() => track("police_call", { station: s.id, sector: sectorId })}>📞 {p}</a>)}</dd>
        <dt>Email</dt>
        <dd>{s.emails.length ? s.emails.map((m) => <a key={m} className="link" href={`mailto:${m}`}>{m}</a>) : "Not listed"}</dd>
      </dl>
      <div className="police-actions">
        <a className="btn small ghost" target="_blank" rel="noopener noreferrer" href={maps(s.name, sectorById(sectorId)?.name ?? "")}>📍 Open in Maps</a>
        <a className="btn small ghost" target="_blank" rel="noopener noreferrer" href={s.official ? `${OFFICIAL_SITE}/${s.official}` : OFFICIAL_SITE}>Official page</a>
      </div>
    </section>
  );
}

/** Police helpline page for one sector: nearby thanas with address, phone and email. */
export default function Police({ sectorId }: { sectorId: string }) {
  const sector = sectorById(sectorId);
  if (!sector) return <div className="panel-body"><h2>Sector not found</h2><a className="link" {...linkProps("/")}>Back to the map</a></div>;
  const { stations, women } = stationsFor(sector);
  return (
    <article className="panel-body police">
      <button type="button" className="link small-txt" onClick={() => goBack(`/sector/${sector.id}`)}>← Back to {sector.name}</button>
      <h2>Police stations near {sector.name}</h2>

      <div className="helplines">
        <b>In an emergency, call 112 first.</b>
        <div>{HELPLINES.map((h) => <a key={h.n} className="btn small" href={tel(h.n)}>📞 {h.n}</a>)}</div>
        <small className="muted">{HELPLINES.map((h) => `${h.n}: ${h.label}`).join(" · ")}</small>
      </div>

      {stations[0]?.km > 5 && <p className="note">No listed station is close to this sector. Call 112 and they will route you to the right station.</p>}
      {stations.map((n, i) => <Card key={n.station.id} n={n} sectorId={sector.id} label={i === 0 ? "Closest" : "Also close by"} />)}
      {women && <Card n={women} sectorId={sector.id} women label="Women police station nearest to you" />}

      <p className="note">
        These are the closest stations by distance. Which station handles a street is decided by Gurugram Police, so ask the one you call
        whether it is theirs, and they will pass you on. Numbers and emails come from a contact list updated {STATIONS_UPDATED} and can change:
        confirm on the <a className="link" href={OFFICIAL_SITE} target="_blank" rel="noopener noreferrer">official Gurugram Police site</a>.
        Found a wrong number? Use "Suggest a correction" on the sector page.
      </p>
      <a className="btn ghost" {...linkProps(`/sector/${sector.id}`)}>Back to {sector.name}</a>
    </article>
  );
}
