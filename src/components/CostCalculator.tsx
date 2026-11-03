import { useState } from "react";
import type { Sector } from "../data/sectors";
import { WATER } from "../data/risk";
import { linkProps } from "../lib/router";
import { money } from "../lib/store";

// Typical Gurgaon renting norms (negotiable): deposit 2 months for flats, 1 for PGs; brokerage ~1 month.
const HOME_TYPES = [
  { v: "pg", l: "PG (single room)", factor: 0, deposit: 1, broker: false, moving: 2 },
  { v: "1bhk", l: "1BHK (est.)", factor: 0.65, deposit: 2, broker: true, moving: 6 },
  { v: "2bhk", l: "2BHK", factor: 1, deposit: 2, broker: true, moving: 8 },
  { v: "3bhk", l: "3BHK (est.)", factor: 1.45, deposit: 2, broker: true, moving: 12 },
] as const;

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function CostCalculator({ sector }: { sector: Sector }) {
  const { salary, people } = money.use();
  const [type, setType] = useState<(typeof HOME_TYPES)[number]["v"]>("2bhk");
  const t = HOME_TYPES.find((x) => x.v === type)!;
  const [lo, hi] = t.v === "pg" ? sector.pgRent : sector.rent2bhk.map((x) => x * t.factor) as [number, number];
  const [rentK, setRentK] = useState<number | null>(null);
  const rent = (rentK ?? Math.round((lo + hi) / 2)) * 1000;
  const [brokerMonths, setBrokerMonths] = useState(0.5);
  const [depositMonths, setDepositMonths] = useState<number>(t.deposit);
  const [tanker, setTanker] = useState(WATER[sector.id] ? 3000 : 0);
  const sharers = t.v === "pg" ? 1 : Math.max(1, people);
  const perHead = rent / sharers;
  const maintenance = t.v === "pg" ? 0 : Math.round(rent * 0.08);
  const deposit = t.v === "pg" ? 1 : depositMonths;
  const brokerage = t.broker ? rent * brokerMonths : 0;
  const upfront = rent * deposit + brokerage + rent + t.moving * 1000;
  const share = salary ? (perHead + (maintenance + tanker) / sharers) / salary : null;
  const tone = share == null ? "" : share <= 0.3 ? "good" : share <= 0.4 ? "warn" : "bad";

  return (
    <details className="tool">
      <summary>💰 Cost calculator</summary>
      <div className="tool-body">
        <div className="calc-grid">
          <label>Home type
            <select value={type} onChange={(e) => { setType(e.target.value as typeof type); setRentK(null); }}>
              {HOME_TYPES.map((h) => <option key={h.v} value={h.v}>{h.l}</option>)}
            </select>
          </label>
          {t.v !== "pg" && (
            <label>People sharing
              <select value={people} onChange={(e) => money.set((m) => ({ ...m, people: +e.target.value }))}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? "Just me" : `${n} people`}</option>)}
              </select>
            </label>
          )}
          <label>Your monthly in-hand salary
            <input type="number" inputMode="numeric" min={0} step={5000} placeholder="e.g. 120000" value={salary || ""}
              onChange={(e) => money.set((m) => ({ ...m, salary: Math.max(0, +e.target.value || 0) }))} />
          </label>
        </div>
        <label className="slider-label">Rent: <b>{inr(rent)}</b>/month <small className="muted">(typical {inr(lo * 1000)}–{inr(hi * 1000)})</small>
          <input type="range" min={Math.round(lo * 0.7)} max={Math.round(hi * 1.3)} step={1} value={rentK ?? Math.round((lo + hi) / 2)}
            onChange={(e) => setRentK(+e.target.value)} />
        </label>
        <div className="calc-grid">
          {t.v !== "pg" && (
            <label>Security deposit
              <select value={depositMonths} onChange={(e) => setDepositMonths(+e.target.value)}>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n} month{n > 1 ? "s" : ""} of rent</option>)}
              </select>
            </label>
          )}
          {t.broker && (
            <label>Broker fee
              <select value={brokerMonths} onChange={(e) => setBrokerMonths(+e.target.value)}>
                <option value={0}>None (direct owner)</option><option value={0.5}>½ month</option><option value={1}>1 month</option>
              </select>
            </label>
          )}
          <label>Water tankers / month
            <input type="number" inputMode="numeric" min={0} step={500} value={tanker}
              onChange={(e) => setTanker(Math.max(0, +e.target.value || 0))} />
            <small className="muted">{WATER[sector.id] ? "Shortages reported here; tankers cost ₹3,000+ in some societies" : "Usually 0 unless your society has shortages"}</small>
          </label>
        </div>

        <div className="calc-out">
          <div><span>Your monthly share</span><b>{inr(perHead + (maintenance + tanker) / sharers)}</b><small className="muted">{maintenance || tanker ? `incl. ~${inr((maintenance + tanker) / sharers)} maintenance${tanker ? " + tankers" : ""}` : "PG usually includes bills"}</small></div>
          {share != null && <div className={`afford ${tone}`}><span>Of your salary</span><b>{Math.round(share * 100)}%</b><small>{tone === "good" ? "Comfortable (≤30%)" : tone === "warn" ? "Stretching (30–40%)" : "Too high (>40%)"}</small></div>}
          <div className="wide"><span>Upfront to move in{sharers > 1 ? " (your share)" : ""}</span><b>{inr(upfront / sharers)}</b>
            <small className="muted">{deposit} month{deposit > 1 ? "s" : ""} deposit (refundable, but nothing in Haryana law caps it or forces a refund date) + first month{brokerage ? ` + ${inr(brokerage)} brokerage` : ""} + ~{inr(t.moving * 1000)} moving</small></div>
        </div>
        <p className="muted small-txt">See the <a className="link" {...linkProps("/rent-safety")}>rent safety guide</a> before paying anything. Estimates based on typical Gurgaon terms; 1BHK and 3BHK are scaled from 2BHK ranges. Your salary stays on this device.</p>
      </div>
    </details>
  );
}
