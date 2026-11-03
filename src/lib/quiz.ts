import { SECTORS } from "../data/sectors";
import { allScores, matchScore, PRIORITIES, ZERO_WEIGHTS, type Office, type PriorityKey, type Weights } from "./score";
import type { ResultEntry } from "./share";

export type Option = { label: string; w?: Partial<Weights>; budget?: number };
export type Question = { id: string; title: string; hint?: string; options: Option[] };

// Office is asked separately (it is a picker, not a fixed list of options).
export const QUESTIONS: Question[] = [
  {
    id: "who", title: "Who is moving in?",
    options: [
      { label: "🧑 Just me", w: { nightlife: 2, afford: 2 } },
      { label: "👩 A woman living solo", w: { safety: 5, transit: 3, market: 2 } },
      { label: "💑 Couple", w: { safety: 3, market: 2, nightlife: 2 } },
      { label: "👨‍👩‍👧 Family with kids", w: { schools: 5, safety: 4, green: 3, health: 3, water: 3 } },
      { label: "👯 Flatmates", w: { afford: 4, transit: 2, nightlife: 2 } },
    ],
  },
  {
    id: "budget", title: "Monthly rent for a 2 BHK?", hint: "We'll hide sectors where even the cheapest flats cost more.",
    options: [
      { label: "Under ₹25k", budget: 25, w: { afford: 4 } },
      { label: "₹25k – 40k", budget: 40, w: { afford: 2 } },
      { label: "₹40k – 60k", budget: 60 },
      { label: "₹60k+ / no limit", budget: 0 },
    ],
  },
  {
    id: "move", title: "How will you get around?",
    options: [
      { label: "🚗 Own car / bike", w: { drain: 1 } },
      { label: "🚇 Metro + cabs", w: { transit: 5 } },
      { label: "🚶 Mostly walking", w: { transit: 3, market: 5 } },
    ],
  },
  {
    id: "vibe", title: "Your ideal weekend?",
    options: [
      { label: "🍸 Cafes & nightlife", w: { nightlife: 5, market: 2 } },
      { label: "🌳 Parks & quiet", w: { green: 5, air: 3 } },
      { label: "🛍️ Malls & markets", w: { market: 5, nightlife: 2 } },
      { label: "🏠 Staying in", w: { clean: 3, health: 1 } },
    ],
  },
  {
    id: "hate", title: "What would ruin it for you?", hint: "Pick the one that bothers you most.",
    options: [
      { label: "🗑️ Dirty roads & societies", w: { clean: 5 } },
      { label: "🌫️ Bad air", w: { air: 5, green: 2 } },
      { label: "🌧️ Waterlogging", w: { drain: 5 } },
      { label: "🚰 Water shortage / tankers", w: { water: 5 } },
      { label: "🚦 Long daily commute", w: { commute: 4, techhub: 3 } },
      { label: "🌙 Feeling unsafe at night", w: { safety: 5 } },
    ],
  },
];

// Women-first variant: asks about getting home at night instead of weekends/nightlife.
export const QUESTIONS_WOMEN: Question[] = [
  {
    id: "who", title: "Who are you moving in as?",
    options: [
      { label: "👩 Woman living solo", w: { safety: 5, transit: 3, market: 2 } },
      { label: "👯 Women flatmates", w: { safety: 4, afford: 3, transit: 2 } },
      { label: "🏨 PG / hostel", w: { safety: 5, afford: 4, transit: 3 } },
      { label: "👩‍👧 With family or kids", w: { safety: 4, schools: 4, green: 3, health: 3, water: 3 } },
    ],
  },
  QUESTIONS[1],
  {
    id: "home", title: "How do you usually get home?",
    options: [
      { label: "🚗 Own car / scooter", w: { safety: 2 } },
      { label: "🚇 Metro, then auto or cab", w: { transit: 5, safety: 3 } },
      { label: "🚕 Office cab", w: { techhub: 2, safety: 3 } },
      { label: "🚶 I walk the last stretch", w: { safety: 5, market: 3, transit: 3 } },
    ],
  },
  {
    id: "late", title: "How late do you usually get home?",
    options: [
      { label: "Before 8pm", w: { safety: 2 } },
      { label: "Around 8–10pm", w: { safety: 4, transit: 2 } },
      { label: "After 10pm", w: { safety: 5, transit: 3, market: 2 } },
    ],
  },
  {
    id: "hate", title: "What would ruin it for you?", hint: "Pick the one that bothers you most.",
    options: [
      { label: "🌙 Dark, empty streets", w: { safety: 5 } },
      { label: "🗑️ Dirty roads & societies", w: { clean: 5, safety: 1 } },
      { label: "🚰 Water shortage / tankers", w: { water: 5 } },
      { label: "🌧️ Waterlogging", w: { drain: 5 } },
      { label: "🚦 Long daily commute", w: { commute: 4, techhub: 3 } },
    ],
  },
];
export const questionsFor = (women: boolean) => (women ? QUESTIONS_WOMEN : QUESTIONS);

export type Answers = { choices: Record<string, number>; office: Office };

/** Sum the picked options' weights, clamped to the 0–5 scale used by the Matcher. */
export function answersToPrefs(a: Answers, questions: Question[] = QUESTIONS): { weights: Weights; budget: number; office: Office } {
  const weights: Weights = { ...ZERO_WEIGHTS };
  let budget = 0;
  for (const q of questions) {
    const o = q.options[a.choices[q.id]];
    if (!o) continue;
    if (o.budget != null) budget = o.budget;
    for (const [k, v] of Object.entries(o.w ?? {})) weights[k as PriorityKey] += v as number;
  }
  if (a.office) { weights.commute += 4; weights.techhub += 1; }
  for (const p of PRIORITIES) weights[p.key] = Math.min(5, weights[p.key]);
  return { weights, budget, office: a.office };
}

export type Pick = ResultEntry & { reasons: string[] };

export function topPicks(weights: Weights, office: Office, budget: number, n = 3): Pick[] {
  return SECTORS.map((s) => ({ s, m: matchScore(s, weights, office) ?? 0 }))
    .filter(({ s }) => !budget || s.rent2bhk[0] <= budget)
    .sort((a, b) => b.m - a.m)
    .slice(0, n)
    .map(({ s, m }) => {
      const sc = allScores(s, office);
      const reasons = PRIORITIES.filter((p) => weights[p.key] >= 3 && (sc[p.key] ?? 0) >= 4)
        .sort((a, b) => weights[b.key] * (sc[b.key] ?? 0) - weights[a.key] * (sc[a.key] ?? 0))
        .slice(0, 3)
        .map((p) => p.label.toLowerCase());
      return { id: s.id, match: m, reasons };
    });
}
