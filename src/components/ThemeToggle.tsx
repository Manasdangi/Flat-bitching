import { useEffect, useState } from "react";

type Theme = "auto" | "light" | "dark";
const KEY = "gff-theme";
const NEXT: Record<Theme, Theme> = { auto: "light", light: "dark", dark: "auto" };
const ICON: Record<Theme, string> = { auto: "🌓", light: "☀️", dark: "🌙" };
const LABEL: Record<Theme, string> = { auto: "Theme: automatic (follows your phone)", light: "Theme: light", dark: "Theme: dark" };

const read = (): Theme => {
  try { const v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "auto"; } catch { return "auto"; }
};

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
  const dark = t === "dark" || (t === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#121a2e" : "#ffffff");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(read);
  useEffect(() => { apply(theme); }, [theme]);
  const next = () => {
    const n = NEXT[theme];
    setTheme(n);
    try { localStorage.setItem(KEY, n); } catch { /* ignore */ }
  };
  return (
    <button className="theme-btn" onClick={next} aria-label={LABEL[theme]} title={LABEL[theme]}>
      <span aria-hidden="true">{ICON[theme]}</span>
      <small>{theme === "auto" ? "Auto" : theme === "light" ? "Light" : "Dark"}</small>
    </button>
  );
}
