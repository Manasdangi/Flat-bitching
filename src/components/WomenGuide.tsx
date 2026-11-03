import { useState } from "react";
import { linkProps } from "../lib/router";

type Section = { title: string; icon: string; intro?: string; items: string[] };

const SECTIONS: Section[] = [
  {
    title: "Judge the area before you fall for the flat", icon: "🔎",
    intro: "Visit twice: once in daylight and once after dark, around the time you'd normally come home.",
    items: [
      "Walk from the nearest metro or main road to the building at 9–10pm. Are the streets lit and are there other people around?",
      "Note where an auto or cab can drop you, and how long the walk is from there to the gate.",
      "Find the nearest police station and hospital, and save both numbers in your phone.",
      "Ask two or three current residents or the guard about night safety, water and power. Read the resident answers and reviews on each sector page here.",
      "Check that the society has guards at the gate and working CCTV, and that visitors are logged.",
    ],
  },
  {
    title: "PG and hostel safety checklist", icon: "🛏️",
    intro: "Based on checklists from Housing.com and a Gurgaon PG guide (sources below).",
    items: [
      "Controlled entry (biometric, RFID or digital lock) and a guard or reception on duty around the clock",
      "CCTV in corridors, entrances and parking, but not inside rooms or bathrooms",
      "Women-only property or separate women's floors, with clear visitor hours",
      "A lockable room or locker, and staff who enter rooms only with your permission",
      "Owner and staff are verified (ask whether guards and housekeeping are police-verified)",
      "Fire extinguishers, smoke detectors, marked exits and a first-aid kit; power backup that works",
      "A female warden or a clear way to complain if something goes wrong",
      "Written agreement covering rent, deposit, notice period, refund timeline, curfew and visitor rules",
      "Curfew and gate timings that suit your work hours. If you work late, ask before you pay",
    ],
  },
  {
    title: "Questions to ask the landlord or PG owner", icon: "💬",
    intro: "Some landlords prefer families and set stricter rules for single women. Asking early avoids surprises after you pay.",
    items: [
      "What are the rules on visitors, guests, curfew and late entry? Please put them in writing.",
      "Does the owner live on the premises, and when can the owner or staff enter my room? (Ask for advance notice.)",
      "Are there rules about food, cooking, clothing or friends that are not in the agreement?",
      "Who do I call if there is a problem at night, and how fast does someone respond?",
      "What happens to my deposit if I leave early, and within how many days is it returned?",
    ],
  },
  {
    title: "Getting home safely", icon: "🚕",
    intro: "Safety experts point to the final stretch from the drop-off point to your door as the riskiest part.",
    items: [
      "If you take an office cab, ask HR about the night-shift policy: GPS tracking, a guard when a woman is dropped first or last, and a 24/7 control room. Haryana is reported to have issued night-transport guidelines for companies in 2025, so ask yours whether it follows them.",
      "Share your live location with someone you trust for late trips, and note the cab number plate.",
      "Prefer a flat on a lit main road close to your drop-off point over a quiet lane that is cheaper.",
      "Check the metro's last train time for your station and plan a backup if you could miss it.",
      "Wait for a ride near a guard post, shop or other people, not at an empty gate.",
    ],
  },
];

const HELPLINES = [
  { n: "112", label: "Emergency (police, ambulance, fire)" },
  { n: "1091", label: "Women helpline" },
  { n: "181", label: "Women helpline (alternative)" },
];

export default function WomenGuide() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <div className="panel-body">
      <p className="eyebrow">Women's guide</p>
      <h2>Renting and living safely in Gurgaon</h2>
      <p className="muted">For single working women and PG residents. Tick items as you check them (they reset when you leave the page).</p>

      <div className="helplines">
        <b>Save these numbers</b>
        <div className="row wrap">
          {HELPLINES.map((h) => <a key={h.n} className="btn small" href={`tel:${h.n}`}>📞 {h.n}</a>)}
        </div>
        <small className="muted">{HELPLINES.map((h) => `${h.n}: ${h.label}`).join(" · ")}. Check that they work from your phone.</small>
      </div>

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

      <p>Paying a deposit? Read <a className="link" {...linkProps("/rent-safety")}>how to rent safely in Gurgaon</a> first.</p>
      <p className="muted small-txt">
        General information, not legal advice. Sources:{" "}
        <a className="link" href="https://housing.com/news/what-should-women-look-for-when-choosing-hostels-and-pgs/" target="_blank" rel="noreferrer">Housing.com</a>,{" "}
        <a className="link" href="https://www.your-space.in/blogs/looking-for-safe-pg-for-girls-in-gurgaon-follow-this-checklist-for-guidance/" target="_blank" rel="noreferrer">Your-Space (Gurgaon PG checklist)</a>,{" "}
        <a className="link" href="https://feminisminindia.com/2026/02/18/the-last-mile-home-nights-shifts-and-the-crisis-of-urban-mobility/" target="_blank" rel="noreferrer">Feminism in India (last-mile safety)</a>,{" "}
        <a className="link" href="https://yourstory.com/herstory/2023/04/rental-woes-of-single-women-in-urban-india" target="_blank" rel="noreferrer">YourStory (single women renting)</a>.
      </p>
      <p><a className="btn small ghost" {...linkProps("/")}>← Back to the map</a></p>
    </div>
  );
}
