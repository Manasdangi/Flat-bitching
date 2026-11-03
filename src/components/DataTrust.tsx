import { COMMUNITY_MIN_VOTES, communityFor } from "../lib/score";
import { FLOOD, WATER } from "../data/risk";
import { linkProps } from "../lib/router";

type Kind = "sourced" | "estimate" | "residents";
const TAG: Record<Kind, string> = { sourced: "Sourced", estimate: "Estimate", residents: "Residents" };

/** One-glance "how much should I trust this?" list for a sector, with a link to the full method page. */
export default function DataTrust({ sectorId }: { sectorId: string }) {
  const cm = communityFor(sectorId);
  const votes = cm ? Math.max(0, ...Object.values(cm).map((v) => v?.n ?? 0)) : 0;
  const rows: { what: string; kind: Kind; how: string }[] = [
    { what: "Boundaries, drive times", kind: "sourced", how: "OpenStreetMap; peak-hour time is our estimate" },
    { what: "Water and flood", kind: "sourced", how: FLOOD[sectorId] || WATER[sectorId] ? "Public reports (see links above), compiled Nov 2026" : "Nothing reported in our sources, which is not a guarantee" },
    { what: "Rents", kind: "estimate", how: "Rough ranges from 2025–26 listings; resident reports show once 3+ come in" },
    { what: "Safety, cleanliness, other scores", kind: votes >= COMMUNITY_MIN_VOTES ? "residents" : "estimate", how: votes >= COMMUNITY_MIN_VOTES ? `Editorial estimate adjusted by resident votes (${votes} on the busiest question)` : "Editorial estimate, no resident votes yet" },
  ];
  return (
    <div className="trust">
      <h3>How reliable is this page?</h3>
      <ul>
        {rows.map((r) => (
          <li key={r.what}><span className={`tag ${r.kind}`}>{TAG[r.kind]}</span> <b>{r.what}</b> <small className="muted">· {r.how}</small></li>
        ))}
      </ul>
      <small className="muted">Spot something wrong? Use the correction links on this page. <a className="link" {...linkProps("/data")}>How we get our data</a></small>
    </div>
  );
}
