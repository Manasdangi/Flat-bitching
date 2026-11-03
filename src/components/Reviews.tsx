import { useEffect, useState } from "react";
import { friendlyError } from "../lib/api";
import {
  addReview, ASPECTS, aspectAverages, listReviews, reportReview, REVIEW_TAGS, usingSupabase,
  type AspectKey, type Review,
} from "../lib/reviews";
import { linkProps } from "../lib/router";
import { slugify } from "../lib/societies";
import { track } from "../lib/track";

type Props = {
  sectorId: string;
  societies: string[]; // named societies in this sector, for tagging
  society?: string; // when shown on a society page: filter + preselect
};

const EMPTY = { name: "", rating: 4, tags: [] as string[], text: "", society: "", aspects: {} as Partial<Record<AspectKey, number>> };

function Stars({ value, onChange, label, size = 22 }: { value: number; onChange: (n: number) => void; label: string; size?: number }) {
  return (
    <div className="stars" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? "on" : ""} style={{ fontSize: size }}
          onClick={() => onChange(value === n ? 0 : n)} aria-label={`${label}: ${n} of 5`}>★</button>
      ))}
    </div>
  );
}

export default function Reviews({ sectorId, societies, society }: Props) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ ...EMPTY, society: society ?? "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    listReviews(society ? { society } : { sectorId })
      .then(setItems)
      .catch(() => setError("Couldn't load reviews."))
      .finally(() => setLoading(false));
  };
  useEffect(load, [sectorId, society]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.text.trim().length < 10) return setError("Write at least a line (10+ characters).");
    setSaving(true);
    setError("");
    try {
      await addReview({ sectorId, society: form.society || null, name: form.name, rating: form.rating, tags: form.tags, text: form.text, aspects: form.aspects });
      track("review_posted", { sector: sectorId });
      setForm({ ...EMPTY, society: society ?? "" });
      setShowForm(false);
      setNotice("Thanks! Your review is live.");
      load();
    } catch (err) {
      setError(friendlyError(err, "Couldn't save the review. Try again."));
    } finally {
      setSaving(false);
    }
  };

  const report = async (id: string) => {
    if (!confirm("Report this review as spam, abusive or fake?")) return;
    try {
      await reportReview(id, "Reported from site");
      setReported((s) => new Set(s).add(id));
      track("review_reported");
    } catch {
      setReported((s) => new Set(s).add(id)); // already reported from this network, or offline
    }
  };

  const toggleTag = (t: string) =>
    setForm((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }));

  const avg = items.length ? items.reduce((a, r) => a + r.rating, 0) / items.length : null;
  const aspects = aspectAverages(items);

  return (
    <section>
      <div className="row between">
        <h3>Resident reviews {avg != null && <span className="muted">· ★ {avg.toFixed(1)} ({items.length})</span>}</h3>
        <button className="btn small" onClick={() => { setShowForm((v) => !v); setNotice(""); }}>{showForm ? "Cancel" : "+ Add review"}</button>
      </div>
      {!usingSupabase && <p className="note">Demo mode: reviews are saved only in this browser.</p>}

      {aspects.some((a) => a.n > 0) && (
        <ul className="scores resident">
          {aspects.map((a) => (
            <li key={a.key}>
              <span>{a.label} {a.n > 0 && <small className="muted">({a.n})</small>}</span>
              {a.avg == null ? <span className="muted small-txt">no ratings yet</span> : <span className="bar"><span className="fill alt" style={{ width: `${(a.avg / 5) * 100}%` }} /></span>}
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form className="review-form" onSubmit={submit}>
          <input placeholder="Name (optional)" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {!society && societies.length > 0 && (
            <select value={form.society} onChange={(e) => setForm({ ...form, society: e.target.value })}>
              <option value="">Which society? (optional)</option>
              {societies.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <label className="field-label">Overall</label>
          <Stars value={form.rating} onChange={(n) => setForm({ ...form, rating: n || 1 })} label="Overall rating" size={26} />
          <details>
            <summary>Rate specific things (optional)</summary>
            <div className="aspect-grid">
              {ASPECTS.map((a) => (
                <div key={a.key} className="aspect-row">
                  <span>{a.label}</span>
                  <Stars value={form.aspects[a.key] ?? 0} label={a.label} size={18}
                    onChange={(n) => setForm({ ...form, aspects: { ...form.aspects, [a.key]: n || undefined } })} />
                </div>
              ))}
            </div>
          </details>
          <div className="chips">
            {REVIEW_TAGS.map((t) => (
              <button type="button" key={t} className={`chip ${form.tags.includes(t) ? "on" : ""}`} onClick={() => toggleTag(t)}>{t}</button>
            ))}
          </div>
          <textarea rows={4} maxLength={1000} value={form.text}
            placeholder="How's cleanliness, safety at night, water, power, waterlogging, maintenance, landlords?"
            onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <button className="btn" disabled={saving}>{saving ? "Saving…" : "Post review"}</button>
          <small className="muted">One review per sector per day. Spam and abuse get removed.</small>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      {loading ? <p className="muted">Loading…</p> : items.length === 0 ? (
        <p className="muted">No reviews yet. Live here? Be the first to help someone choose.</p>
      ) : (
        <ul className="reviews">
          {items.map((r, i) => (
            <li key={r.id ?? i}>
              <div className="row between">
                <b>{r.name}</b>
                <span className="star-txt">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              {r.society && !society && <a className="soc-link" {...linkProps(`/society/${slugify(r.society)}`)}>🏢 {r.society}</a>}
              {r.tags.length > 0 && <div className="chips">{r.tags.map((t) => <span key={t} className="chip on small">{t}</span>)}</div>}
              <p>{r.text}</p>
              {Object.keys(r.aspects).length > 0 && (
                <p className="aspect-line">{ASPECTS.filter((a) => r.aspects[a.key]).map((a) => `${a.label} ${r.aspects[a.key]}/5`).join(" · ")}</p>
              )}
              <div className="row between">
                <small className="muted">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
                {r.id && usingSupabase && (
                  reported.has(r.id)
                    ? <small className="muted">Reported, thanks</small>
                    : <button className="link small-txt" onClick={() => report(r.id!)}>Report</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
