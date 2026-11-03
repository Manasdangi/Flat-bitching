import { useEffect, useState } from "react";
import { friendlyError, hasBackend } from "../lib/api";
import { aqiBand, loadAqi, type Aqi } from "../lib/geo";
import { suggestCorrection } from "../lib/reviews";
import { track } from "../lib/track";

/** Live air quality (model-based, Open-Meteo / CAMS) for a point. */
export function AqiBadge({ lat, lng }: { lat: number; lng: number }) {
  const [aqi, setAqi] = useState<Aqi | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setAqi(undefined);
    loadAqi(lat, lng).then((a) => live && setAqi(a));
    return () => { live = false; };
  }, [lat, lng]);
  if (aqi === undefined) return <div className="aqi muted">Air quality: loading…</div>;
  if (!aqi) return null;
  const b = aqiBand(aqi.aqi);
  return (
    <div className="aqi" title="Live US AQI estimate from Open-Meteo (CAMS model), not a ground station">
      <span className="aqi-dot" style={{ background: b.color }} />
      <span>Air quality now: <b>{aqi.aqi}</b> AQI · {b.label}</span>
      <small className="muted"> · PM2.5 {aqi.pm25} µg/m³</small>
    </div>
  );
}

const TOPICS = [
  { v: "rent", l: "Rent is wrong" },
  { v: "society", l: "Society missing or wrong" },
  { v: "scores", l: "Scores feel off" },
  { v: "water_flood", l: "Water or flood info is wrong" },
  { v: "safety", l: "Safety info is wrong" },
  { v: "location", l: "Location or boundary wrong" },
  { v: "other", l: "Something else" },
];

/** Let residents suggest data fixes; the owner reviews them in Supabase. */
export function SuggestFix({ sectorId, defaultTopic = "rent", label = "✏️ Suggest a correction" }: { sectorId: string; defaultTopic?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(defaultTopic);
  const [msg, setMsg] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [err, setErr] = useState("");
  if (!hasBackend) return null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (msg.trim().length < 10) return setErr("Add a few details (10+ characters).");
    setState("saving"); setErr("");
    try {
      await suggestCorrection(sectorId, topic, msg);
      track("correction_suggested", { sector: sectorId, topic });
      setState("done");
    } catch (e2) {
      setErr(friendlyError(e2, "Couldn't send. Try again."));
      setState("idle");
    }
  };

  if (state === "done") return <p className="success">Thanks! We'll review your suggestion.</p>;
  return (
    <div className="fix">
      {!open ? (
        <button className="link" onClick={() => setOpen(true)}>{label}</button>
      ) : (
        <form className="review-form" onSubmit={send}>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <textarea rows={3} maxLength={1000} value={msg} placeholder="What should it say? e.g. 2BHK in Sobha City is ₹45–55k now"
            onChange={(e) => setMsg(e.target.value)} />
          <div className="row">
            <button className="btn small" disabled={state === "saving"}>{state === "saving" ? "Sending…" : "Send"}</button>
            <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          {err && <p className="error">{err}</p>}
        </form>
      )}
    </div>
  );
}
