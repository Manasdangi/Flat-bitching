import { SECTORS, sectorById, type Sector } from "./sectors";

/**
 * Police stations (thanas) of Gurugram Police.
 *
 * Phone numbers and emails: a Gurugram police-station contact list updated 23 Jun 2026 (indiacustomercare.com).
 * Addresses: findeasy.in station list. Neither is the official site, so the page tells people to confirm there.
 * Official site: https://gurgaon.haryanapolice.gov.in
 *
 * `at` places the station for the "nearest station" calculation: a sector id from our data, or [lat, lng].
 * Which station covers a given street is decided by Gurugram Police, so "nearest" is only a guide.
 */
export type Station = {
  id: string;
  name: string;
  zone: "East" | "West" | "South" | "Manesar";
  women?: boolean;
  address?: string;
  phones: string[];
  emails: string[];
  at: string | [number, number];
  /** Slug of the station's page on the official site, when known. */
  official?: string;
};

const mail = (...x: string[]) => x;

export const STATIONS: Station[] = [
  { id: "dlf-1", name: "DLF Phase 1", zone: "East", address: "Plot 10, G Block, DLF Phase 1, Gurugram 122001", phones: ["0124-4059084", "0124-2567223", "9999981827"], emails: mail("shodlfphase1-hry@nic.in"), at: "dlf-phase-1" },
  { id: "dlf-2", name: "DLF Phase 2", zone: "East", address: "Road N-14, Akashneem Marg, DLF Phase 2, Gurugram 122001", phones: ["0124-2566387", "9999981821"], emails: mail("shodlf2ggn-hry@nic.in"), at: "25", official: "ps-dlf-ph-2" },
  { id: "dlf-3", name: "DLF Phase 3", zone: "East", phones: ["0124-2566380", "9205892152"], emails: mail("shodlfphase3grg.pol@hry.gov.in"), at: "24" },
  { id: "metro", name: "Metro Police Station", zone: "East", address: "MG Road, Gurugram 122002", phones: ["0124-2570800", "9999981829"], emails: mail("shometroggn-hry@nic.in"), at: [28.4795, 77.0806], official: "metro" },
  { id: "sec-29", name: "Sector 29", zone: "East", address: "Near Fire Brigade Station, Sector 29, Gurugram 122002", phones: ["0124-2396700", "9999981822"], emails: mail("shodlfggn-hry@nic.in"), at: "29" },
  { id: "sec-40", name: "Sector 40", zone: "East", address: "Near National Law College, Sector 40, Gurugram 122001", phones: ["0124-2381567", "9999981824"], emails: [], at: "40" },
  { id: "sushant-lok", name: "Sushant Lok", zone: "East", address: "Near Vyapar Kendra, B Block, Sushant Lok Phase 1, Gurugram 122002", phones: ["0124-2386231", "9999981826"], emails: mail("shosushantlok-hry@nic.in", "shosec40ggn-hry@nic.in"), at: "sushant-lok-1", official: "ps-sushant-lok" },
  { id: "sec-50", name: "Sector 50", zone: "East", address: "Sector 50 area (one list shows Sector 46), Gurugram 122001", phones: ["0124-2583777", "9205892111"], emails: mail("shosec50ggm.pol-hry@gov.in"), at: "50" },
  { id: "sec-53", name: "Sector 53", zone: "East", address: "Sector 53, Gurugram 122002", phones: ["0124-2576355", "9205892112"], emails: mail("shosec53ggm.pol-hry@gov.in"), at: "53", official: "ps-sector-53" },
  { id: "sec-56", name: "Sector 56", zone: "East", address: "Near Abash Society, HUDA Market, Sector 56, Gurugram 122011", phones: ["0124-2574100", "9999981823"], emails: mail("shosec56ggn-hry@nic.in"), at: "56" },
  { id: "women-east", name: "Women Police Station (East)", zone: "East", women: true, address: "DCP Crime Office, near Mayfield Garden, Sector 51, Gurugram 122001", phones: ["0124-2218057", "9205892122"], emails: mail("showomenpsgn-hry@gov.in"), at: "51" },
  // Address not in our list, so it is placed by Civil Lines (a guess): its distance is shown as a rough guide only.
  { id: "women-west", name: "Women Police Station (West)", zone: "West", women: true, phones: ["0124-2365900", "9205892107"], emails: mail("showomenpsgn-hry@gov.in"), at: "15" },
  { id: "sec-65", name: "Sector 65", zone: "South", address: "Opp. IREO Grand Arch Society, Golf Course Extension Road, Gurugram 122102", phones: ["9205855217", "9205892147"], emails: mail("shosec65grg.pol@hry.gov.in"), at: "65" },
  { id: "badshahpur", name: "Badshahpur", zone: "South", address: "Aklimpur Tikli Road, near bus stand, Badshahpur, Gurugram 122001", phones: ["0124-2394062", "9999981844"], emails: mail("shobadshahpur-hry@nic.in"), at: "70" },
  { id: "bhondsi", name: "Bhondsi", zone: "South", address: "SH 13, Bhondsi, Gurugram 122001", phones: ["0124-2393100", "9999981846"], emails: mail("shobhondsi-hry@nic.in"), at: "75" },
  { id: "city", name: "City Gurugram", zone: "West", address: "Mehrauli-Gurgaon Road, near Govt. Girls College, Gurugram 122001", phones: ["0124-2321496", "9999981833"], emails: mail("shoggncity-hry@nic.in"), at: "12", official: "ps-city-gurgaon" },
  { id: "civil-lines", name: "Civil Lines", zone: "West", address: "Near Galaxy Hotel, Sector 15, Gurugram 122001", phones: ["0124-2224233", "9999981834"], emails: mail("shocivillinesggn-hry@nic.in"), at: "15", official: "ps-civil-lines" },
  { id: "shivaji-nagar", name: "Shivaji Nagar", zone: "West", address: "Shivaji Nagar, Gurugram 122001", phones: ["0124-2307300", "9205892120"], emails: mail("shoshivaggm.pol-hry@gov.in"), at: "11" },
  { id: "new-colony", name: "New Colony", zone: "West", address: "Near Vikram Bahal Park, Gurudwara Road, Gurugram 122001", phones: ["9205892119"], emails: mail("shoncggm.pol-hry@gov.in"), at: "7", official: "ps-new-colony" },
  { id: "sec-9a", name: "Sector 9A", zone: "West", address: "Near Gauri Shankar Mandir, Sector 9A, Gurugram 122001", phones: ["0124-2251437", "9205892117"], emails: mail("shosec9aggm.pol-hry@gov.in"), at: "9a" },
  { id: "palam-vihar", name: "Palam Vihar", zone: "West", phones: ["0124-2360148", "9999981832"], emails: mail("shopalamvihar-hry@nic.in"), at: "palam-vihar" },
  { id: "udyog-vihar", name: "Udyog Vihar", zone: "West", address: "Near Sarita Honda, PNB Road, Udyog Vihar Phase 1, Gurugram 122016", phones: ["0124-2340200", "9999981831"], emails: mail("shoudyogvihar-hry@nic.in"), at: "18", official: "ps-udyog-vihar.htm" },
  { id: "sec-17-18", name: "Sector 17/18", zone: "West", address: "Opp. Plot 60, Sector 17/18, Gurugram 122016", phones: ["0124-2398140", "9999981838"], emails: mail("shosec17-hry@nic.in"), at: "17" },
  { id: "sec-5", name: "Sector 5 (Old Gurugram)", zone: "West", address: "Near Dronacharya Public School, Sector 5, Gurugram 122001", phones: ["0124-2254610", "9999981835"], emails: mail("shosec5oldggn-hry@nic.in"), at: "5" },
  { id: "sec-14", name: "Sector 14", zone: "West", address: "Near Dev Public School, Sector 14, Gurugram 122001", phones: ["0124-2300365", "9205892118"], emails: mail("shosec14ggm.pol-hry@gov.in"), at: "14" },
  { id: "sec-10a", name: "Sector 10A", zone: "West", address: "Opp. IDPC Apartment, Sector 10A, Gurugram 122001", phones: ["9999981836"], emails: mail("shosec10ggn-hry@nic.in"), at: "10a" },
  { id: "bajghera", name: "Bajghera", zone: "West", address: "Najafgarh Road, Chandan Vihar, Sector 110, Gurugram 122017", phones: ["9205892116", "8595953223"], emails: mail("shobajggm.pol-hry@gov.in"), at: "110" },
  { id: "rajendra-park", name: "Rajendra Park", zone: "West", address: "Near Spanish Court, Block C-I, Palam Vihar, Gurugram 122017", phones: ["0124-2469210", "9999981837"], emails: mail("shorajendrapark-hry@nic.in"), at: "palam-vihar" },
  { id: "sec-37", name: "Sector 37", zone: "Manesar", address: "Plot 578, Phase IV, Sector 37, Gurugram 122004", phones: ["0124-2210100", "9205892115"], emails: mail("shosec37ggm.pol-hry@gov.in"), at: "37" },
];

/** Numbers everyone should have. Station numbers change, these do not. */
export const HELPLINES = [
  { n: "112", label: "Emergency (police, ambulance, fire)" },
  { n: "1091", label: "Women helpline" },
  { n: "0124-2316100", label: "Gurugram Police control room" },
  { n: "0124-2311033", label: "Gurugram Cyber Crime Cell" },
];

export const OFFICIAL_SITE = "https://gurgaon.haryanapolice.gov.in";
export const STATIONS_UPDATED = "23 June 2026";

const pos = (s: Station): [number, number] | null => {
  if (Array.isArray(s.at)) return s.at;
  const x = sectorById(s.at);
  return x ? [x.lat, x.lng] : null;
};

function km(a: [number, number], b: [number, number]) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Near = { station: Station; km: number };

/**
 * Stations near a sector: the closest one, plus any other regular station almost as close
 * (a sector can be served by more than one), up to 3, and always the nearest women's police station.
 */
export function stationsFor(sector: Sector): { stations: Near[]; women: Near | null } {
  const here: [number, number] = [sector.lat, sector.lng];
  const all = STATIONS.map((s) => ({ station: s, p: pos(s) }))
    .filter((x): x is { station: Station; p: [number, number] } => x.p !== null)
    .map((x) => ({ station: x.station, km: km(here, x.p) }))
    .sort((a, b) => a.km - b.km);
  const regular = all.filter((x) => !x.station.women);
  const first = regular[0];
  const stations = regular.filter((x, i) => i === 0 || (i < 3 && x.km <= Math.max(first.km * 1.5, first.km + 1.2)));
  return { stations, women: all.find((x) => x.station.women) ?? null };
}

export function stationById(id: string) { return STATIONS.find((s) => s.id === id); }
export const ALL_SECTOR_IDS = SECTORS.map((s) => s.id);
