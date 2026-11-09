import { sectorById } from "../data/sectors";
import { linkProps, navigate } from "../lib/router";
import { matchScore, type Office, type Weights } from "../lib/score";
import { societyBySlug } from "../lib/societies";
import { isSaved, setNote, shortlist, toggleSaved, type SavedItem } from "../lib/store";
import { track } from "../lib/track";

export function SaveButton({ kind, id }: { kind: SavedItem["kind"]; id: string }) {
  const items = shortlist.use();
  const saved = isSaved(items, kind, id);
  return (
    <button className={`btn small ${saved ? "saved" : "ghost"}`} aria-pressed={saved}
      onClick={() => { toggleSaved(kind, id); if (!saved) track("shortlist_add", { kind }); }}>
      {saved ? "♥ Saved" : "♡ Save"}
    </button>
  );
}

const label = (it: Pick<SavedItem, "kind" | "id">) =>
  it.kind === "sector" ? sectorById(it.id)?.name ?? `Sector ${it.id}` : societyBySlug(it.id)?.name ?? it.id;
const path = (it: Pick<SavedItem, "kind" | "id">) => (it.kind === "sector" ? `/sector/${it.id}` : `/society/${it.id}`);

/** Encode/decode a shortlist into a shareable URL: /shortlist?s=48,25&so=sobha-city */
export function shareUrl(items: SavedItem[]) {
  const s = items.filter((x) => x.kind === "sector").map((x) => x.id).join(",");
  const so = items.filter((x) => x.kind === "society").map((x) => x.id).join(",");
  const q = new URLSearchParams();
  if (s) q.set("s", s);
  if (so) q.set("so", so);
  return `${location.origin}/shortlist?${q}`;
}
function sharedFromUrl(): Pick<SavedItem, "kind" | "id">[] {
  const q = new URLSearchParams(location.search);
  const valid = (x: string) => /^[a-z0-9-]{1,60}$/.test(x);
  return [
    ...(q.get("s") ?? "").split(",").filter(valid).filter((x) => sectorById(x)).map((id) => ({ kind: "sector" as const, id })),
    ...(q.get("so") ?? "").split(",").filter(valid).filter((x) => societyBySlug(x)).map((id) => ({ kind: "society" as const, id })),
  ];
}

/** Saved places and Compare live under one "Shortlist" tab; this switches between the two. */
export function ShortlistTabs({ active, compareCount }: { active: "saved" | "compare"; compareCount: number }) {
  const saved = shortlist.use().length;
  return (
    <div className="seg" role="tablist" aria-label="Shortlist">
      <a role="tab" aria-selected={active === "saved"} className={active === "saved" ? "on" : ""} {...linkProps("/shortlist")}>♥ Saved{saved ? ` (${saved})` : ""}</a>
      <a role="tab" aria-selected={active === "compare"} className={active === "compare" ? "on" : ""} {...linkProps("/compare")}>⚖️ Compare{compareCount ? ` (${compareCount})` : ""}</a>
    </div>
  );
}

export default function ShortlistPage({ weights, office, compareIds, setCompare }: {
  weights: Weights; office: Office; compareIds: string[]; setCompare: (ids: string[]) => void;
}) {
  const items = shortlist.use();
  const shared = sharedFromUrl();

  if (shared.length) {
    return (
      <div className="panel-body">
        <h2>Shared shortlist</h2>
        <p className="muted">Someone shared these places with you.</p>
        <ul className="saved-list">
          {shared.map((it) => (
            <li key={it.kind + it.id}><a className="link" {...linkProps(path(it))}>{it.kind === "society" ? "🏢 " : ""}{label(it)}</a></li>
          ))}
        </ul>
        <div className="row">
          <button className="btn small" onClick={() => {
            shared.forEach((it) => { if (!isSaved(shortlist.get(), it.kind, it.id)) toggleSaved(it.kind, it.id); });
            navigate("/shortlist", true);
          }}>Add all to my shortlist</button>
          <a className="btn small ghost" {...linkProps("/shortlist")}>Open mine</a>
        </div>
      </div>
    );
  }

  const share = async () => {
    const url = shareUrl(items);
    track("shortlist_share", { n: items.length });
    try {
      if (navigator.share) await navigator.share({ title: "My Gurgaon flat shortlist", url });
      else { await navigator.clipboard?.writeText(url); alert("Link copied"); }
    } catch { /* cancelled */ }
  };
  const sectorIds = items.filter((x) => x.kind === "sector").map((x) => x.id);

  return (
    <div className="panel-body">
      <ShortlistTabs active="saved" compareCount={compareIds.length} />
      <h2>♥ My shortlist</h2>
      {items.length === 0 ? (
        <>
          <p>Nothing saved yet. Tap <b>♡ Save</b> on any sector or society to keep it here, add notes after visits, and share the list with your partner or flatmates.</p>
          <a className="btn small" {...linkProps("/match")}>Find sectors that match you</a>
        </>
      ) : (
        <>
          <p className="muted">Saved on this device. Notes are private until you share.</p>
          <div className="actions">
            <button className="btn small" onClick={share}>Share list</button>
            {sectorIds.length >= 2 && (
              <button className="btn small ghost" onClick={() => { setCompare(sectorIds.slice(0, 3)); navigate("/compare"); }}>
                Compare {Math.min(3, sectorIds.length)} sectors
              </button>
            )}
          </div>
          <ul className="saved-list">
            {items.map((it) => {
              const sec = it.kind === "sector" ? sectorById(it.id) : societyBySlug(it.id)?.sectors[0];
              const m = sec && it.kind === "sector" ? matchScore(sec, weights, office) : null;
              return (
                <li key={it.kind + it.id}>
                  <div className="row between">
                    <a className="link" {...linkProps(path(it))}>{it.kind === "society" ? "🏢 " : ""}{label(it)}</a>
                    <span className="row">
                      {m != null && <span className="pill">{m}%</span>}
                      {sec && <span className="muted small-txt">₹{sec.rent2bhk[0]}–{sec.rent2bhk[1]}k</span>}
                      <button className="icon-btn" aria-label="Remove" onClick={() => toggleSaved(it.kind, it.id)}>✕</button>
                    </span>
                  </div>
                  <textarea rows={2} maxLength={500} placeholder="Notes after visiting: rent quoted, owner, issues…"
                    value={it.note} onChange={(e) => setNote(it.kind, it.id, e.target.value)} />
                  {it.kind === "sector" && compareIds.includes(it.id) && <small className="muted">In compare</small>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
