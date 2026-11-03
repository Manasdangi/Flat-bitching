import { linkProps } from "../lib/router";
import { FLOOD_SOURCE, WATER_SOURCE } from "../data/risk";
import { SRC } from "../data/evidence";
import { MAX_COMMUNITY_SHIFT } from "../lib/score";

const ext = (href: string, label: string) => <a className="link" href={href} target="_blank" rel="noreferrer">{label}</a>;

export default function DataMethod() {
  return (
    <div className="panel-body">
      <p className="eyebrow">Transparency</p>
      <h2>How we get our data</h2>
      <p className="muted">Gurgaon has no single official source for sector-level livability, so this site mixes public sources, our own estimates and what residents tell us. Here is which is which, and where it can be wrong.</p>

      <section className="safety-section">
        <h3>📍 Sourced from public data</h3>
        <ul className="safety-list">
          <li>Sector outlines and road drive times: {ext("https://www.openstreetmap.org/copyright", "OpenStreetMap")}. Peak-hour times are our estimate on top of the road distance.</li>
          <li>Air quality: live model estimate from {ext("https://open-meteo.com/", "Open-Meteo")} (CAMS), not a ground monitor.</li>
          <li>Waterlogging: compiled from {ext(FLOOD_SOURCE.url, FLOOD_SOURCE.label)}. Water shortages: {ext(WATER_SOURCE.url, WATER_SOURCE.label)}. These are news and local reports, not official surveys, and they were compiled in Nov 2026.</li>
          <li>More flood reports: {ext(SRC.tribune2025.url, SRC.tribune2025.label)}, {ext(SRC.indiatv2025.url, SRC.indiatv2025.label)} and {ext(SRC.tribune2026.url, SRC.tribune2026.label)}. A sector named in these (and not already in our list) is marked medium risk.</li>
          <li>Water: a second opinion from {ext(SRC.sqyWater.url, SRC.sqyWater.label)}. It's a real-estate portal, so we use it as a cross-check, and where it disagrees with residents or news reports we show both.</li>
          <li>Women's safety: spots named by Gurugram Police ({ext(SRC.police2024.url, SRC.police2024.label)}). These are specific spots, not whole sectors, and date from 2024.</li>
          <li>Rents: asking rents read from {ext(SRC.sqyRent.url, SRC.sqyRent.label)} listing pages for a sample of busy sectors, used to check and adjust our ranges. Asking prices run above final rents, and we only read the first page of each.</li>
          <li>Rent safety and Haryana tenancy rules come from property and legal explainers (linked on that page). They are general information, not legal advice.</li>
        </ul>
      </section>

      <section className="safety-section">
        <h3>🧮 Our estimates</h3>
        <ul className="safety-list">
          <li>Sector scores (safety, cleanliness, drainage and others) and rent ranges are editorial estimates based on listings from 2025–26 and public reporting. Treat them as a starting point and visit before you rent.</li>
          <li>"Nearby" places are straight-line distances to the places we list, not travel times.</li>
          <li>Flood and water evidence caps the drainage and water scores. A sector with reported flooding can't score well on drainage.</li>
        </ul>
      </section>

      <section className="safety-section">
        <h3>🗣️ From residents</h3>
        <ul className="safety-list">
          <li>Polls, reviews and rent reports are anonymous. We don't ask for names or phone numbers.</li>
          <li>Polls: one answer per question per sector per device every 30 days, and a daily cap, to limit repeat voting. A single question can only take a limited number of votes per day.</li>
          <li>Poll answers start adjusting a score only after 5 votes on a question, and move it gradually. Residents can shift a score by at most about {MAX_COMMUNITY_SHIFT} points from our estimate. Results under 15 votes are labelled an early signal.</li>
          <li>Rent reports: figures show only after 3 reports. Implausible amounts, and amounts far from a sector's other reports, are held for review instead of being shown.</li>
          <li>Reviews that several different people report are hidden automatically.</li>
        </ul>
      </section>

      <section className="safety-section">
        <h3>⚠️ Known limits</h3>
        <ul className="safety-list">
          <li>Anonymous voting can't fully stop a determined person from gaming a sector. That is why community input is capped.</li>
          <li>A sector with no reported flood or water problem may simply have little coverage. It isn't a guarantee.</li>
          <li>Conditions change every monsoon. Ask current residents and the society before signing anything.</li>
        </ul>
      </section>

      <p className="muted">Found something wrong? Open any sector and use the correction links, or tell us what it should say. We review every suggestion.</p>
      <p><a className="btn small ghost" {...linkProps("/")}>← Back to the map</a></p>
    </div>
  );
}
