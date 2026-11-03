import { useEffect, useState } from "react";
import { addReview, listReviews, REVIEW_TAGS, usingSupabase, type Review } from "../lib/reviews";

export default function Reviews({ sectorId }: { sectorId: string }) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", rating: 4, tags: [] as string[], text: "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listReviews(sectorId)
      .then(setItems)
      .catch(() => setError("Couldn't load reviews."))
      .finally(() => setLoading(false));
  };
  useEffect(load, [sectorId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.text.trim().length < 10) return setError("Write at least a line (10+ characters).");
    setSaving(true);
    setError("");
    try {
      await addReview({ sectorId, ...form });
      setForm({ name: "", rating: 4, tags: [], text: "" });
      setShowForm(false);
      load();
    } catch {
      setError("Couldn't save the review. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (t: string) =>
    setForm((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }));

  const avg = items.length ? items.reduce((a, r) => a + r.rating, 0) / items.length : null;

  return (
    <section>
      <div className="row between">
        <h3>Resident reviews {avg != null && <span className="muted">· ★ {avg.toFixed(1)} ({items.length})</span>}</h3>
        <button className="btn small" onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Add review"}</button>
      </div>
      {!usingSupabase && (
        <p className="note">Demo mode: reviews are saved only in this browser until Supabase is configured.</p>
      )}

      {showForm && (
        <form className="review-form" onSubmit={submit}>
          <input placeholder="Name (optional)" value={form.name} maxLength={40}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} className={n <= form.rating ? "on" : ""}
                onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`}>★</button>
            ))}
          </div>
          <div className="chips">
            {REVIEW_TAGS.map((t) => (
              <button type="button" key={t} className={`chip ${form.tags.includes(t) ? "on" : ""}`} onClick={() => toggleTag(t)}>{t}</button>
            ))}
          </div>
          <textarea rows={4} maxLength={1000} value={form.text}
            placeholder="How's cleanliness, safety at night, water, power, waterlogging, maintenance, landlords?"
            onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <button className="btn" disabled={saving}>{saving ? "Saving…" : "Post review"}</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}

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
              {r.tags.length > 0 && <div className="chips">{r.tags.map((t) => <span key={t} className="chip on small">{t}</span>)}</div>}
              <p>{r.text}</p>
              <small className="muted">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
