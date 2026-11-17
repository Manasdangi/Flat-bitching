import { useEffect, useState } from "react";
import { friendlyError } from "../lib/api";
import { feedbackEnabled, recordVisit, sendFeedback } from "../lib/feedback";
import { track } from "../lib/track";

const MIN = 5, MAX = 1000;

/** Home-page card: write and send feedback, plus a small unique-visitor line. */
export default function FeedbackCard() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const [visitors, setVisitors] = useState<number | null>(null);
  useEffect(() => { recordVisit().then(setVisitors); }, []);
  if (!feedbackEnabled) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (msg.trim().length < MIN) return setErr(`Please write at least ${MIN} characters.`);
    setState("sending"); setErr("");
    try {
      await sendFeedback(msg, contact);
      track("feedback_sent", {});
      setState("done"); setMsg(""); setContact("");
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
            <label htmlFor="fb-contact" className="small-txt muted">Email or phone, only if you want a reply (optional)</label>
            <input id="fb-contact" type="text" maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="off" />
            {err && <p className="error small-txt" role="alert">{err}</p>}
            <div className="row fb-actions">
              <button className="btn small" disabled={state === "sending" || msg.trim().length < MIN}>{state === "sending" ? "Sending…" : "Send feedback"}</button>
              <button type="button" className="link small-txt" onClick={() => { setOpen(false); setErr(""); }}>Cancel</button>
            </div>
            <small className="muted">Anonymous by default. Please don't include sensitive personal details.</small>
          </form>
        )}
      </section>
      {visitors != null && visitors >= 1 && (
        <p className="visitor-line muted small-txt">👀 {visitors.toLocaleString("en-IN")} unique visitor{visitors === 1 ? "" : "s"} so far</p>
      )}
    </>
  );
}
