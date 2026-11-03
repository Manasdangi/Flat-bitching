import { useState } from "react";
import type { Sector } from "../data/sectors";
import { track } from "../lib/track";

const pad = (n: number) => String(n).padStart(2, "0");
const local = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const defaultWhen = () => { const d = new Date(Date.now() + 86400000); d.setHours(17, 0, 0, 0); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T17:00`; };

/** Plan a flat visit and share it with a friend (WhatsApp / share sheet), plus a calendar reminder. No data leaves the device. */
export default function VisitPlanner({ sector }: { sector: Sector }) {
  const [when, setWhen] = useState(defaultWhen);
  const [place, setPlace] = useState("");
  const [who, setWho] = useState("");
  const [mins, setMins] = useState("60");
  const start = new Date(when);
  const ok = !Number.isNaN(start.getTime());
  const checkIn = ok ? new Date(start.getTime() + Number(mins) * 60000) : null;
  const fmt = (d: Date) => d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const night = ok && (start.getHours() >= 19 || start.getHours() < 6);

  const text = () => [
    `Hi! I'm going to see a flat in ${sector.name}, Gurgaon on ${fmt(start)}.`,
    place && `Place: ${place}`,
    who && `Meeting: ${who}`,
    `Area on map: https://www.google.com/maps?q=${sector.lat},${sector.lng}`,
    `Please message me around ${checkIn ? fmt(checkIn) : "the end of the visit"}. If you don't hear from me, call me.`,
    `Planned with Gurgaon Flat Finder: ${location.origin}/sector/${sector.id}`,
  ].filter(Boolean).join("\n");

  const whatsapp = () => { track("visit_share", { sector: sector.id, via: "whatsapp" }); window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, "_blank", "noopener"); };
  const share = async () => {
    track("visit_share", { sector: sector.id, via: "sheet" });
    try { if (navigator.share) await navigator.share({ text: text() }); else await navigator.clipboard?.writeText(text()); } catch { /* cancelled */ }
  };
  const ics = () => {
    track("visit_reminder", { sector: sector.id });
    const end = new Date(start.getTime() + 3600000);
    const esc = (s: string) => s.replace(/[\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gurgaon Flat Finder//EN", "BEGIN:VEVENT", `UID:${Date.now()}@gurgaon-flat-finder`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, "")}`, `DTSTART:${local(start)}`, `DTEND:${local(end)}`,
      `SUMMARY:${esc(`Flat visit: ${sector.name}`)}`, `DESCRIPTION:${esc(text())}`, "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Flat visit soon", "TRIGGER:-PT45M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    a.download = `flat-visit-${sector.id}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <details className="tool">
      <summary>📅 Plan a visit and tell a friend</summary>
      <div className="tool-body">
        <p className="muted small-txt">Pick a time, then send the plan to a friend or family member. Nothing is saved or sent from here.</p>
        <div className="calc-grid">
          <label>Visit time<input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <label>Check in with me after
            <select value={mins} onChange={(e) => setMins(e.target.value)}>
              <option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option>
            </select>
          </label>
          <label>Building / society<input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. tower and society name" maxLength={80} /></label>
          <label>Meeting (owner or agent name)<input value={who} onChange={(e) => setWho(e.target.value)} placeholder="optional" maxLength={60} /></label>
        </div>
        {night && <p className="note">🌙 This is after dark. If you can, see the flat in daylight first, then come back in the evening with a friend to judge the street.</p>}
        <ul className="more-reports">
          <li>Share your live location on WhatsApp for the visit.</li>
          <li>Don't go alone to an empty building. Ask to meet the owner or agent at the gate.</li>
          <li>Never pay a deposit or token before you've seen the flat and checked the papers.</li>
        </ul>
        <div className="row wrap">
          <button className="btn small" onClick={whatsapp} disabled={!ok}>Send on WhatsApp</button>
          <button className="btn small ghost" onClick={share} disabled={!ok}>Share / copy</button>
          <button className="btn small ghost" onClick={ics} disabled={!ok}>Add reminder</button>
        </div>
      </div>
    </details>
  );
}
