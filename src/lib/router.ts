import { useEffect, useState } from "react";

// Minimal path router: /, /match, /compare, /sector/:id, /society/:slug
export type Route =
  | { view: "explore" }
  | { view: "match" }
  | { view: "compare" }
  | { view: "shortlist" }
  | { view: "quiz" }
  | { view: "rentSafety" }
  | { view: "women" }
  | { view: "data" }
  | { view: "ask" }
  | { view: "quizResult" }
  | { view: "sector"; id: string }
  | { view: "society"; slug: string };

export function parse(path: string): Route {
  const [, a, b] = path.split("?")[0].replace(/\/+$/, "").split("/");
  if (a === "sector" && b) return { view: "sector", id: decodeURIComponent(b).toLowerCase() };
  if (a === "society" && b) return { view: "society", slug: decodeURIComponent(b) };
  if (a === "match") return { view: "match" };
  if (a === "compare") return { view: "compare" };
  if (a === "shortlist") return { view: "shortlist" };
  if (a === "women") return { view: "women" };
  if (a === "data") return { view: "data" };
  if (a === "ask") return { view: "ask" };
  if (a === "rent-safety") return { view: "rentSafety" };
  if (a === "quiz") return b === "result" ? { view: "quizResult" } : { view: "quiz" };
  return { view: "explore" };
}

export function navigate(path: string, replace = false) {
  if (path === location.pathname + location.search) return;
  history[replace ? "replaceState" : "pushState"](null, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo?.({ top: 0 });
}

export function useRoute(): Route {
  const [path, setPath] = useState(() => {
    // Old #/sector/48 links keep working.
    if (location.hash.startsWith("#/")) {
      const p = location.hash.slice(1);
      history.replaceState(null, "", p);
      return p;
    }
    return location.pathname;
  });
  useEffect(() => {
    const on = () => setPath(location.pathname);
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  return parse(path);
}

/** <a> that navigates client-side but stays a real link (shareable, crawlable). */
export function linkProps(path: string) {
  return {
    href: path,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(path);
    },
  };
}
