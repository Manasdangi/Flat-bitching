import { useEffect, useState } from "react";
import { sectorById } from "../data/sectors";
import { listReviews, type Review } from "../lib/reviews";
import { linkProps } from "../lib/router";

/** The newest resident reviews across all sectors, for the home panel. */
export default function LatestReviews() {
  const [items, setItems] = useState<Review[] | null>(null);
  useEffect(() => { listReviews({ limit: 5 }).then(setItems).catch(() => setItems([])); }, []);
  if (!items || items.length === 0) return null;
  return (
    <>
      <h3>Latest from residents</h3>
      <ul className="reviews compact">
        {items.map((r, i) => (
          <li key={r.id ?? i}>
            <div className="row between">
              <a className="link" {...linkProps(`/sector/${r.sectorId}`)}>{r.society ?? sectorById(r.sectorId)?.name ?? r.sectorId}</a>
              <span className="star-txt">{"★".repeat(r.rating)}</span>
            </div>
            <p>{r.text.length > 140 ? r.text.slice(0, 140) + "…" : r.text}</p>
            <small className="muted">{r.name} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small>
          </li>
        ))}
      </ul>
    </>
  );
}
