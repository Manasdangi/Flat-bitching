import { useEffect, useState } from "react";
import { OFFICES, SECTORS, sectorById } from "../data/sectors";
import { answersToPrefs, questionsFor, topPicks } from "../lib/quiz";
import { womenMode } from "../lib/store";
import { linkProps, navigate } from "../lib/router";
import { cardUrl, encodeResult, parseResult, shareLink, type ResultEntry } from "../lib/share";
import { track } from "../lib/track";
import type { Office, Weights } from "../lib/score";

const short = (n: string) => n.replace(/\s*\(.*\)/, "");

type QuizProps = { onDone: (p: { weights: Weights; budget: number; office: Office }) => void };

export function Quiz({ onDone }: QuizProps) {
  const women = womenMode.use();
  const QUESTIONS = questionsFor(women);
  const total = QUESTIONS.length + 1; // + office step
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [office, setOffice] = useState<Office>(null);
  const [started, setStarted] = useState(false);

  const finish = (o: Office, c = choices) => {
    const p = answersToPrefs({ choices: c, office: o }, QUESTIONS);
    track("quiz_complete", { office: Boolean(o) });
    onDone(p);
    const top = topPicks(p.weights, p.office, p.budget);
    navigate(`/quiz/result?r=${encodeURIComponent(encodeResult(top))}`);
  };

  if (!started) {
    return (
      <div className="panel-body quiz">
        <p className="eyebrow">60-second quiz</p>
        <h2>{women ? "Find a safe sector for you" : "Find your best Gurgaon sector"}</h2>
        <p className="muted">{women ? "A few taps about how you live and get home. " : ""}Six taps. We'll weigh safety, metro, air, commute and budget for you and pick your top 3 of {SECTORS.length} sectors.</p>
        <button className="btn" onClick={() => { setStarted(true); track("quiz_start"); }}>Start the quiz →</button>
      </div>
    );
  }

  const q = QUESTIONS[step];
  return (
    <div className="panel-body quiz">
      <div className="quiz-bar"><i style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
      <p className="eyebrow">Question {step + 1} of {total}</p>
      {q ? (
        <>
          <h2>{q.title}</h2>
          {q.hint && <p className="muted">{q.hint}</p>}
          <div className="quiz-options">
            {q.options.map((o, i) => (
              <button key={o.label} className="quiz-opt" onClick={() => { setChoices({ ...choices, [q.id]: i }); setStep(step + 1); }}>{o.label}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2>Where do you work?</h2>
          <p className="muted">We'll use real road drive times to that tech hub.</p>
          <select
            aria-label="Your office"
            value={office ? OFFICES.find((x) => x.name === office.name)?.id ?? "" : ""}
            onChange={(e) => { const o = OFFICES.find((x) => x.id === e.target.value); setOffice(o ? { name: o.name, lat: o.lat, lng: o.lng } : null); }}
          >
            <option value="">Choose a tech hub…</option>
            {OFFICES.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <div className="row wrap" style={{ marginTop: 12 }}>
            <button className="btn" disabled={!office} onClick={() => finish(office)}>See my sectors →</button>
            <button className="btn ghost" onClick={() => finish(null)}>I work remotely / skip</button>
          </div>
        </>
      )}
      {step > 0 && <button className="btn small ghost" style={{ marginTop: 14 }} onClick={() => setStep(step - 1)}>← Back</button>}
    </div>
  );
}

export function QuizResult({ params, weights, office, budget, onSelect }: {
  params: URLSearchParams; weights: Weights; office: Office; budget: number;
  onSelect: (id: string) => void;
}) {
  const shared = params.get("shared") === "1";
  const fromUrl = parseResult(params.get("r"));
  const live = !shared && Object.values(weights).some(Boolean) ? topPicks(weights, office, budget) : null;
  const entries: (ResultEntry & { reasons?: string[] })[] = live ?? fromUrl;
  const [msg, setMsg] = useState("");

  // Keep the address bar in step with what's shown: drive times load after the quiz ends and can reorder the picks.
  const liveKey = live ? encodeResult(live) : null;
  useEffect(() => {
    if (liveKey && params.get("r") !== liveKey) navigate(`/quiz/result?r=${encodeURIComponent(liveKey)}`, true);
  }, [liveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entries.length) {
    return (
      <div className="panel-body quiz">
        <h2>No result yet</h2>
        <p className="muted">Take the 60-second quiz to get your top 3 sectors.</p>
        <a className="btn" {...linkProps("/quiz")}>Start the quiz</a>
      </div>
    );
  }

  const link = shareLink(entries);
  const top = short(sectorById(entries[0].id)!.name);
  const text = `My best Gurgaon match is ${top} (${entries[0].match}%). Find yours in 60 seconds:`;
  const share = async () => {
    track("quiz_share", { via: "native" });
    try {
      if (navigator.share) { await navigator.share({ title: "My best Gurgaon sector", text, url: link }); return; }
      await navigator.clipboard.writeText(`${text} ${link}`);
      setMsg("Link copied!");
    } catch { /* cancelled */ }
  };

  return (
    <div className="panel-body quiz">
      <p className="eyebrow">{shared ? "Shared result" : "Your result"}</p>
      <h2>{shared ? "Their best Gurgaon sectors" : "Your best Gurgaon sectors"}</h2>
      <div className="quiz-results">
        {entries.map((e, i) => {
          const s = sectorById(e.id)!;
          return (
            <button key={e.id} className="quiz-card" onClick={() => onSelect(e.id)}>
              <span className="rank">#{i + 1}</span>
              <span className="grow">
                <b>{short(s.name)}</b>
                <small>{s.zone} · ₹{s.rent2bhk[0]}–{s.rent2bhk[1]}k for 2 BHK</small>
                {e.reasons?.length ? <small>Strong on {e.reasons.join(", ")}</small> : null}
              </span>
              <span className="pill">{e.match}%</span>
            </button>
          );
        })}
      </div>
      {shared ? (
        <a className="btn" {...linkProps("/quiz")}>Take the quiz yourself →</a>
      ) : (
        <>
          <div className="row wrap">
            <button className="btn" onClick={share}>📤 Share my result</button>
            <a className="btn ghost" href={cardUrl(entries, "story")} target="_blank" rel="noreferrer" onClick={() => track("quiz_share", { via: "story" })}>📸 Instagram story image</a>
          </div>
          {msg && <p className="muted">{msg}</p>}
          <div className="row wrap" style={{ marginTop: 12 }}>
            <a className="btn small ghost" {...linkProps("/match")}>Fine-tune in Match</a>
            <a className="btn small ghost" {...linkProps("/quiz")}>Retake</a>
          </div>
        </>
      )}
    </div>
  );
}
