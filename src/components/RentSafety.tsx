import { useState } from "react";
import { linkProps } from "../lib/router";

const SECTIONS: { title: string; icon: string; intro?: string; items: string[] }[] = [
  {
    title: "Before you pay anything", icon: "🛑",
    intro: "Most losses happen before the agreement is signed.",
    items: [
      "Confirm the person you're paying is the owner: ask for ID and a document in the owner's name (electricity bill or sale deed), and speak to the owner directly.",
      "Never pay rent or a deposit to a \"property manager\" or middleman unless the owner confirms it in writing. Tenants have lost deposits and rent this way.",
      "Pay by bank transfer or UPI to an account in the owner's name. Avoid large cash payments and keep every receipt.",
      "Get token money in writing: amount, purpose, and whether it is refundable if either side backs out.",
      "See the flat in person (or on a live video call) before paying. Photos and listings are often outdated or already rented.",
    ],
  },
  {
    title: "What the law says in Haryana", icon: "⚖️",
    intro: "As reported by property sites, not legal advice. The Model Tenancy Act 2021 (two-month deposit cap, Rent Authority) has not been adopted in Haryana.",
    items: [
      "There is no legal cap on the security deposit. In Gurgaon it is usually 2–3 months of rent, set by the agreement.",
      "No law sets a refund date, so write one into the agreement (for example, within 15 days of handing back the flat).",
      "Registration is compulsory only for leases over one year, which is why 11-month agreements are standard. Check the renewal clause, because it can turn into a longer lease.",
      "Landlords usually have to report tenants to the police. This is normally done online, and you should keep a copy.",
    ],
  },
  {
    title: "Clauses to get in the agreement", icon: "📝",
    items: [
      "Owner and tenant names, ID details and the flat address",
      "Monthly rent, due date, and the yearly increase (a percentage)",
      "Deposit amount, refund deadline, and the exact deductions allowed",
      "Notice period for both sides, and any lock-in period",
      "Who pays maintenance, water, electricity, parking and repairs",
      "Visitor and guest rules written down, so they can't be added later",
      "Advance notice (for example 24 hours) before the owner visits the flat",
      "A move-in inventory list with dated photos attached",
    ],
  },
  {
    title: "On move-in day", icon: "🏠",
    items: [
      "Photograph every room, fixture and any damage, and email the photos to the owner the same day.",
      "Note the electricity, water and gas meter readings.",
      "Run taps, flush toilets and check water pressure on every floor you'll use.",
      "Look for damp, seepage and cracks, especially in basement or ground-floor flats.",
      "Ask neighbours and the RWA about water supply, power cuts, tanker costs and flooding in the monsoon.",
    ],
  },
  {
    title: "Red flags", icon: "🚩",
    items: [
      "Pressure to pay today or lose the flat",
      "Rent far below the area's usual range",
      "Owner can't be met, only a \"manager\" or broker",
      "Refusal to put terms in writing",
      "Payment asked into a personal account that isn't the owner's",
    ],
  },
];

export default function RentSafety() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <div className="panel-body">
      <p className="eyebrow">Tenant guide</p>
      <h2>Rent safely in Gurgaon</h2>
      <p className="muted">A checklist built from tenant stories and Haryana's rules. Tick items off as you go (they reset when you leave the page).</p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="safety-section">
          <h3>{s.icon} {s.title}</h3>
          {s.intro && <p className="muted">{s.intro}</p>}
          <ul className="safety-list">
            {s.items.map((it) => {
              const k = `${s.title}:${it}`;
              return (
                <li key={k}>
                  <label className="check"><input type="checkbox" checked={Boolean(done[k])} onChange={(e) => setDone((d) => ({ ...d, [k]: e.target.checked }))} /> <span>{it}</span></label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="muted small-txt">
        This is general information, not legal advice. For a large deposit or a long lease, have a lawyer read the agreement. Sources:{" "}
        <a className="link" href="https://realtyhunting.com/gurgaon-rent-rules-2026-guide-to-new-registration-deposit-laws/" target="_blank" rel="noreferrer">RealtyHunting</a>,{" "}
        <a className="link" href="https://www.businesstoday.in/amp/latest/trends/story/we-lost-rs70000-overnight-gurgaon-tenants-allege-eviction-after-owner-broker-dispute-535034-2026-06-06" target="_blank" rel="noreferrer">Business Today</a>,{" "}
        <a className="link" href="https://www.nobroker.in/tenant-verification/guides/tenant-police-verification-online-gurgaon/" target="_blank" rel="noreferrer">NoBroker (police verification)</a>.
      </p>
      <p><a className="btn small ghost" {...linkProps("/")}>← Back to the map</a></p>
    </div>
  );
}
