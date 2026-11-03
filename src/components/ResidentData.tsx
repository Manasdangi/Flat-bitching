import { useEffect, useState } from "react";
import type { Sector } from "../data/sectors";
import { friendlyError } from "../lib/api";
import {
  addRentReport, communityEnabled, HOME_LABEL, loadPolls, loadRentSummary, POLLS, vote, votedAlready,
  type HomeType, type PollAnswer, type PollCounts, type PollKey, type RentRow,
} from "../lib/community";
import { track } from "../lib/track";

const MIN_POLL = 5; // votes needed before we show percentages
const MIN_RENT = 3; // reports needed before we show a rent figure
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const ANSWERS: { v: PollAnswer; l: string }[] = [{ v: "yes", l: "Yes" }, { v: "sometimes", l: "Sometimes" }, { v: "no", l: "No" }];

export function ResidentPolls({ sectorId }: { sectorId: string }) {
  const [counts, setCounts] = useState<PollCounts | null>(null);
  const [voted, setVoted] = useState<PollKey[]>(() => votedAlready(sectorId));
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let live = true;
    setVoted(votedAlready(sectorId)); setMsg(""); setCounts(null);
    loadPolls(sectorId).then((c) => live && setCounts(c)).catch(() => {});
    return () => { live = false; };
  }, [sectorId]);
  if (!communityEnabled) return null;

  const cast = async (q: PollKey, a: PollAnswer) => {
    setMsg("");
    try {
      await vote(sectorId, q, a);
      track("poll_vote", { sector: sectorId, q, a });
      setVoted(votedAlready(sectorId));
      setCounts(await loadPolls(sectorId));
    } catch (e) {
      setVoted(votedAlready(sectorId));
      setMsg(friendlyError(e, "Couldn't save your answer. Try again."));
    }
  };

  return (
    <div className="community">
      <h3>🗳️ Ask residents</h3>
      <p className="muted small-txt">One tap each, anonymous. Answer only if you live or have lived here. Results show after 5 votes.</p>
      {POLLS.map((p) => {
        const c = counts?.[p.key];
        const total = c ? c.yes + c.sometimes + c.no : 0;
        const done = voted.includes(p.key);
        return (
          <div key={p.key} className="poll">
            <div className="poll-q">{p.icon} {p.q}</div>
            {total >= MIN_POLL && c ? (
              <div className="poll-bar" title={`${total} votes`}>
                <i className="y" style={{ width: `${(c.yes / total) * 100}%` }} />
                <i className="s" style={{ width: `${(c.sometimes / total) * 100}%` }} />
                <i className="n" style={{ width: `${(c.no / total) * 100}%` }} />
              </div>
            ) : null}
            <small className="muted">
              {total >= MIN_POLL && c ? `${Math.round((c.yes / total) * 100)}% yes · ${Math.round((c.sometimes / total) * 100)}% sometimes · ${Math.round((c.no / total) * 100)}% no · ${total} votes` : total ? `${total} vote${total > 1 ? "s" : ""} so far` : "No votes yet"}
            </small>
            {!done && (
              <div className="row wrap">
                {ANSWERS.map((a) => <button key={a.v} className="chip" onClick={() => cast(p.key, a.v)}>{a.l}</button>)}
              </div>
            )}
          </div>
        );
      })}
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}

export function RentReports({ sector }: { sector: Sector }) {
  const [rows, setRows] = useState<RentRow[] | null>(null);
  const [type, setType] = useState<HomeType>("2bhk");
  const [rent, setRent] = useState("");
  const [maint, setMaint] = useState("");
  const [dep, setDep] = useState("2");
  const [soc, setSoc] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [err, setErr] = useState("");
  const refresh = () => loadRentSummary(sector.id).then(setRows).catch(() => setRows([]));
  useEffect(() => { setRows(null); setState("idle"); setErr(""); refresh(); }, [sector.id]);
  if (!communityEnabled) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = Number(rent);
    if (!Number.isFinite(r) || r < 2000 || r > 500000) return setErr("Enter the monthly rent in rupees (₹2,000–₹5,00,000).");
    setState("saving"); setErr("");
    try {
      await addRentReport({
        sectorId: sector.id, society: soc || null, homeType: type, rent: r,
        maintenance: maint ? Math.max(0, Number(maint)) : undefined, depositMonths: type === "pg" ? undefined : Number(dep),
      });
      track("rent_report", { sector: sector.id, type });
      setState("done"); refresh();
    } catch (e2) {
      setErr(friendlyError(e2, "Couldn't save. Try again.")); setState("idle");
    }
  };

  return (
    <div className="community">
      <h3>💬 What residents actually pay</h3>
      {rows == null ? <p className="muted">Loading…</p> : rows.length === 0 ? (
        <p className="muted">No reports yet. Be the first to share what you pay (anonymous).</p>
      ) : (
        <ul className="rent-rows">
          {rows.map((r) => (
            <li key={r.home_type}>
              <b>{HOME_LABEL[r.home_type]}</b>
              {r.n >= MIN_RENT
                ? <span>{inr(r.median)}/mo <small className="muted">(typical {inr(r.p25)}–{inr(r.p75)} · {r.n} reports{r.avg_deposit ? ` · deposit ~${r.avg_deposit} mo` : ""})</small></span>
                : <small className="muted">{r.n} report{r.n > 1 ? "s" : ""} so far, need {MIN_RENT} to show a figure</small>}
            </li>
          ))}
        </ul>
      )}
      {state === "done" ? <p className="success">Thanks! Your report helps the next person.</p> : (
        <details className="tool">
          <summary>➕ Share what you pay</summary>
          <form className="tool-body" onSubmit={submit}>
            <div className="calc-grid">
              <label>Home type
                <select value={type} onChange={(e) => setType(e.target.value as HomeType)}>
                  {(Object.keys(HOME_LABEL) as HomeType[]).map((k) => <option key={k} value={k}>{HOME_LABEL[k]}</option>)}
                </select>
              </label>
              <label>Monthly rent (₹)
                <input type="number" inputMode="numeric" required min={2000} value={rent} onChange={(e) => setRent(e.target.value)} placeholder="e.g. 42000" />
              </label>
              <label>Maintenance (₹, optional)
                <input type="number" inputMode="numeric" min={0} value={maint} onChange={(e) => setMaint(e.target.value)} />
              </label>
              {type !== "pg" && (
                <label>Deposit
                  <select value={dep} onChange={(e) => setDep(e.target.value)}>
                    {["1", "2", "3", "4"].map((n) => <option key={n} value={n}>{n} month{n === "1" ? "" : "s"}</option>)}
                  </select>
                </label>
              )}
              <label>Society (optional)
                <select value={soc} onChange={(e) => setSoc(e.target.value)}>
                  <option value="">Not sure / other</option>
                  {sector.societies.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            {err && <p className="error">{err}</p>}
            <button className="btn small" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Submit anonymously"}</button>
            <p className="muted small-txt">No name or phone is stored. Share only a rent you actually pay or paid in the last year. One report per home type per month.</p>
          </form>
        </details>
      )}
    </div>
  );
}
