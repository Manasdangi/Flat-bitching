import { useEffect, useState } from "react";
import type { Sector } from "../data/sectors";
import { communityEnabled, loadRentSummary, type RentRow } from "../lib/community";
import { track } from "../lib/track";
import { Tool } from "./Tool";

type Kind = "2bhk" | "pg";
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** "Is my rent fair?": compares the rent someone was quoted with the sector's range and with resident reports. */
export default function RentCheck({ sector }: { sector: Sector }) {
  const [kind, setKind] = useState<Kind>("2bhk");
  const [rent, setRent] = useState("");
  const [maint, setMaint] = useState("");
  const [shown, setShown] = useState(false);
  const [rows, setRows] = useState<RentRow[]>([]);
  useEffect(() => {
    setShown(false); setRent(""); setMaint("");
    if (communityEnabled) loadRentSummary(sector.id).then(setRows).catch(() => setRows([]));
  }, [sector.id]);

  const [lo, hi] = (kind === "pg" ? sector.pgRent : sector.rent2bhk).map((x) => x * 1000);
  const r = Number(rent);
  const valid = Number.isFinite(r) && r >= 2000;
  const resident = rows.find((x) => x.home_type === kind && x.n >= 3);

  let level: "far-low" | "low" | "fair" | "high" | "far-high" = "fair";
  if (valid) level = r < lo * 0.85 ? "far-low" : r < lo ? "low" : r > hi * 1.15 ? "far-high" : r > hi ? "high" : "fair";
  const pos = valid && r >= lo && r <= hi ? (r - lo) / (hi - lo || 1) : null;
  const msg = {
    "far-low": ["🚩 Far below the usual range", "Check why before paying anything. Very low rent can mean a poor building, a scam listing or hidden charges. Never pay a deposit before seeing the flat and the owner's papers."],
    low: ["👍 A little below the usual range", "Good if the flat is genuine. Confirm the maintenance, deposit and what is included."],
    fair: [`✅ Within the usual range${pos != null ? (pos < 0.34 ? " (lower end)" : pos > 0.66 ? " (upper end)" : " (middle)") : ""}`, "Looks reasonable. Compare the condition, floor, furnishing and society before you decide."],
    high: ["⚠️ Above the usual range", "Worth negotiating. Ask what justifies it (furnishing, view, society) and compare with other listings."],
    "far-high": ["🚨 Much above the usual range", "Likely overpriced for this sector. Asking prices are usually a little above what people finally pay, but this is well beyond that."],
  }[level];

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setShown(true);
    track("rent_check", { sector: sector.id, kind, level });
  };

  return (
    <Tool title={<>💰 Is my rent fair?</>}>
      <form className="tool-body" onSubmit={check}>
        <p className="muted small-txt">Enter the rent you were quoted in {sector.name}. Nothing is saved or sent.</p>
        <div className="calc-grid">
          <label>Home type
            <select value={kind} onChange={(e) => { setKind(e.target.value as Kind); setShown(false); }}>
              <option value="2bhk">2 BHK</option><option value="pg">PG (single)</option>
            </select>
          </label>
          <label>Quoted rent (₹/month)
            <input type="number" inputMode="numeric" min={2000} required value={rent} onChange={(e) => { setRent(e.target.value); setShown(false); }} placeholder={kind === "pg" ? "e.g. 14000" : "e.g. 35000"} />
          </label>
          <label>Maintenance (₹, optional)
            <input type="number" inputMode="numeric" min={0} value={maint} onChange={(e) => setMaint(e.target.value)} />
          </label>
        </div>
        <button className="btn small">Check this rent</button>
        {shown && valid && (
          <div className={`verdict ${level}`} role="status">
            <b>{msg[0]}</b>
            <p>{msg[1]}</p>
            <ul className="more-reports">
              <li>Usual range here: {inr(lo)} – {inr(hi)} (rough, from 2025–26 listings)</li>
              {resident && <li>Residents report a typical {inr(resident.median)} ({resident.n} reports)</li>}
              {Number(maint) > 0 && <li>All-in per month with maintenance: <b>{inr(r + Number(maint))}</b></li>}
              {kind === "2bhk" && <li>Deposit is usually 2 months' rent; avoid paying more than that up front.</li>}
            </ul>
          </div>
        )}
      </form>
    </Tool>
  );
}
