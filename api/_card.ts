// Share card layout for @vercel/og (satori). Plain createElement, no JSX build step needed.
import { createElement as h, type ReactElement } from "react";
import { sectorById } from "../src/data/sectors.js";
import type { ResultEntry } from "../src/lib/share.js";

const hue = (m: number) => Math.round((m / 100) * 130);
const short = (name: string) => name.replace(/\s*\(.*\)/, "");

function Row({ e, rank, big, width }: { e: ResultEntry; rank: number; big: boolean; width: number }) {
  const s = sectorById(e.id)!;
  const sub = s.name.match(/\((.*)\)/)?.[1];
  return h(
    "div",
    {
      style: {
        display: "flex", alignItems: "center", gap: big ? 28 : 18, width: width - (big ? 72 : 48),
        background: rank === 1 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)",
        border: "2px solid rgba(255,255,255,0.28)", borderRadius: big ? 28 : 22, padding: big ? "28px 34px" : "8px 22px",
      },
    },
    h("div", { style: { fontSize: big ? 44 : 28, fontWeight: 800, opacity: 0.85, width: big ? 70 : 46 } }, `#${rank}`),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", flex: 1 } },
      h("div", { style: { fontSize: big ? 58 : 32, fontWeight: 800, lineHeight: 1.05 } }, short(s.name)),
      h("div", { style: { fontSize: big ? 28 : 19, opacity: 0.85, marginTop: 4 } }, sub ? `${sub} · ${s.zone}` : s.zone),
    ),
    h(
      "div",
      {
        style: {
          display: "flex", alignItems: "center", justifyContent: "center",
          width: big ? 150 : 72, height: big ? 150 : 72, borderRadius: 999,
          background: `hsl(${hue(e.match)}, 72%, 46%)`, border: "5px solid #fff",
          fontSize: big ? 46 : 26, fontWeight: 800,
        },
      },
      `${e.match}%`,
    ),
  );
}

export function card(entries: ResultEntry[], format: "og" | "story"): ReactElement {
  const story = format === "story";
  const W = story ? 1080 : 1200, H = story ? 1920 : 630, PX = story ? 80 : 56, PY = story ? 140 : 44;
  const inner = W - PX * 2;
  const heading = entries.length ? "My best Gurgaon sectors" : "Find your best Gurgaon sector";
  return h(
    "div",
    {
      style: {
        width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: story ? "center" : "flex-start",
        paddingTop: PY, paddingBottom: PY, gap: story ? 56 : 30,
        color: "#fff", fontFamily: "Inter",
        backgroundImage: "linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #7c3aed 100%)",
      },
    },
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: story ? 14 : 4, width: inner } },
      h("div", { style: { fontSize: story ? 34 : 22, opacity: 0.85, letterSpacing: 2, textTransform: "uppercase", fontWeight: 800 } }, "Gurgaon Flat Finder"),
      h("div", { style: { fontSize: story ? 84 : 42, fontWeight: 800, lineHeight: 1.05 } }, heading),
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: story ? 28 : 8, width: inner } },
      ...(entries.length
        ? entries.map((e, i) => h(Row, { key: e.id, e, rank: i + 1, big: story, width: inner }))
        : [h("div", { key: "x", style: { fontSize: 36, opacity: 0.9 } }, "Answer 6 quick questions and get your top 3 sectors.")]),
    ),
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: story ? 32 : 22, opacity: 0.95, width: inner } },
      h("div", { style: { display: "flex" } }, "Find yours in 60 seconds"),
      h("div", { style: { display: "flex", fontWeight: 800, fontSize: story ? 30 : 22 } }, "gurgaon-flat-finder.vercel.app"),
    ),
  );
}
