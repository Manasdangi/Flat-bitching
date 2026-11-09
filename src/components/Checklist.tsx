import { checklist } from "../lib/store";
import { Tool } from "./Tool";

export const CHECKS: { id: string; text: string }[] = [
  { id: "water", text: "Water: supply hours and source (municipal, borewell, tanker). Check the taste/TDS." },
  { id: "power", text: "Power backup: full load, or only lights and fans?" },
  { id: "night", text: "Visit after dark: street lighting, guards at the gate, how the walk from the main road feels." },
  { id: "monsoon", text: "Ask neighbours if the approach road floods in the monsoon." },
  { id: "network", text: "Mobile signal inside the flat and which broadband providers serve the building." },
  { id: "parking", text: "Parking: covered or assigned? Visitor parking?" },
  { id: "maint", text: "Monthly maintenance charge and what it covers." },
  { id: "deposit", text: "Security deposit (months) and how and when it's refunded." },
  { id: "lockin", text: "Lock-in period and notice period." },
  { id: "broker", text: "Brokerage amount, or is it direct from the owner?" },
  { id: "agreement", text: "Registered rent agreement and police verification." },
  { id: "appliances", text: "What's included: ACs, geyser, fridge, RO, wardrobes." },
  { id: "rules", text: "Society rules on bachelors, guests, pets and cooking non-veg." },
  { id: "nearby", text: "Grocery, pharmacy and food delivery reachable at night." },
];

export default function Checklist({ sectorId }: { sectorId: string }) {
  const all = checklist.use();
  const done = all[sectorId] ?? [];
  const toggle = (id: string) =>
    checklist.set((c) => ({ ...c, [sectorId]: done.includes(id) ? done.filter((x) => x !== id) : [...done, id] }));
  return (
    <Tool title={<>✅ Flat-visit checklist <span className="muted">({done.length}/{CHECKS.length})</span></>}>
      <div className="tool-body">
        <ul className="checklist">
          {CHECKS.map((c) => (
            <li key={c.id}>
              <label className="check"><input type="checkbox" checked={done.includes(c.id)} onChange={() => toggle(c.id)} /> {c.text}</label>
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="btn small ghost" onClick={() => window.print()}>Print checklist</button>
          {done.length > 0 && <button className="link small-txt" onClick={() => checklist.set((c) => ({ ...c, [sectorId]: [] }))}>Reset</button>}
        </div>
      </div>
    </Tool>
  );
}
