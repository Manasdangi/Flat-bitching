import { linkProps } from "../lib/router";
import { nearestMetro } from "../lib/score";
import { societyBySlug, SOCIETIES } from "../lib/societies";
import { AqiBadge } from "./Extras";
import Reviews from "./Reviews";

export default function SocietyPage({ slug, onClose }: { slug: string; onClose: () => void }) {
  const soc = societyBySlug(slug);
  if (!soc) {
    return (
      <div className="panel-body">
        <h2>Society not found</h2>
        <p>Browse the societies we cover:</p>
        <SocietyList />
      </div>
    );
  }
  const s = soc.sectors[0];
  const metro = nearestMetro(s);
  const underConstruction = /under construction|new\)/i.test(soc.name);

  return (
    <article className="panel-body">
      <div className="row between">
        <div>
          <p className="eyebrow">Society · {s.zone}</p>
          <h2>{soc.name}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p>
        In{" "}
        {soc.sectors.map((x, i) => (
          <span key={x.id}>{i > 0 && ", "}<a className="link" {...linkProps(`/sector/${x.id}`)}>{x.name}</a></span>
        ))}
        . {underConstruction && "Parts of this project may still be under construction. "}
        Rent and amenities below are for the sector; ask residents about this society in the reviews.
      </p>
      <AqiBadge lat={s.lat} lng={s.lng} />
      <div className="facts">
        <div><span>Sector 2BHK rent</span><b>₹{s.rent2bhk[0]}k – ₹{s.rent2bhk[1]}k</b></div>
        <div><span>Nearest metro</span><b>{metro.station.name} · {metro.km.toFixed(1)} km</b></div>
      </div>
      <Reviews sectorId={s.id} societies={[soc.name]} society={soc.name} />
      <p><a className="link" {...linkProps(`/sector/${s.id}`)}>See everything about {s.name} ›</a></p>
    </article>
  );
}

export function SocietyList() {
  return (
    <div className="chips">
      {SOCIETIES.map((x) => (
        <a key={x.slug} className="chip link-chip" {...linkProps(`/society/${x.slug}`)}>{x.name}</a>
      ))}
    </div>
  );
}
