import { useEffect, useState } from "react";
import { friendlyError } from "../lib/api";
import { feedbackEnabled, recordVisit, sendFeedback } from "../lib/feedback";

/** Small unique-visitor and total-views line, shown at the top of the home panel. */
export function VisitorLine() {
  const [st, setSt] = useState<{ unique: number; views: number } | null>(null);
  useEffect(() => { recordVisit().then(setSt); }, []);
  if (!st) return null;
  const f = (n: number) => n.toLocaleString("en-IN");
  return <p className="visitor-line muted small-txt">👀 {f(st.unique)} unique visitor{st.unique === 1 ? "" : "s"} · {f(st.views)} total view{st.views === 1 ? "" : "s"}</p>;
}
import { track } from "../lib/track";

const MIN = 5, MAX = 1000;

/** Home-page card: write and send feedback, plus a small unique-visitor line. */
export default function FeedbackCard() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  if (!feedbackEnabled) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (msg.trim().length < MIN) return setErr(`Please write at least ${MIN} characters.`);
    setState("sending"); setErr("");
    try {
      await sendFeedback(msg);
      track("feedback_sent", {});
      setState("done"); setMsg("");
    } catch (e2) {
      setErr(friendlyError(e2, "Couldn't send. Please try again in a moment.")); setState("idle");
    }
  };

  return (
    <>
      <section className="feedback-card" aria-label="Send feedback">
        {state === "done" ? (
          <div className="fb-done" role="status">
            <b>🙏 Thank you, your feedback is in.</b>
            <small className="muted">We read every message. It helps us fix what's wrong and add what's missing.</small>
            <button type="button" className="link small-txt" onClick={() => { setState("idle"); setOpen(true); }}>Send another</button>
          </div>
        ) : !open ? (
          <button type="button" className="fb-open" onClick={() => { setOpen(true); track("feedback_open", {}); }}>
            <span className="fb-ico">💬</span>
            <span><b>Share your feedback</b><small>What's missing, wrong or confusing? Tell us.</small></span>
            <span className="fb-go" aria-hidden="true">›</span>
          </button>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="fb-msg"><b>💬 Your feedback</b></label>
            <textarea id="fb-msg" rows={4} maxLength={MAX} value={msg} onChange={(e) => { setMsg(e.target.value); setErr(""); }} autoFocus
              placeholder="e.g. Sector 57 rent looks too low, or: please add metro timings" />
            <div className="fb-count muted small-txt">{msg.length}/{MAX}</div>
            {err && <p className="error small-txt" role="alert">{err}</p>}
            <div className="row fb-actions">
              <button className="btn small" disabled={state === "sending" || msg.trim().length < MIN}>{state === "sending" ? "Sending…" : "Send feedback"}</button>
              <button type="button" className="link small-txt" onClick={() => { setOpen(false); setErr(""); }}>Cancel</button>
            </div>
            <small className="muted">Anonymous. We don't ask for your name or email.</small>
          </form>
        )}
      </section>
    </>
  );
}
