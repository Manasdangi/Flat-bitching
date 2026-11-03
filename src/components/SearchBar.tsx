import { useMemo, useState } from "react";
import { SECTORS } from "../data/sectors";

export default function SearchBar({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^sec(tor)?\s*/, "");
    if (!t) return [];
    return SECTORS.map((s) => {
      const hay = [s.id, s.name, s.zone, ...s.societies].join(" | ").toLowerCase();
      const society = s.societies.find((x) => x.toLowerCase().includes(t));
      let rank = -1;
      if (s.id === t) rank = 0;
      else if (s.id.startsWith(t)) rank = 1;
      else if (hay.includes(t)) rank = 2;
      return { s, rank, society };
    })
      .filter((r) => r.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 8);
  }, [q]);

  const pick = (id: string) => { onSelect(id); setQ(""); setOpen(false); };

  return (
    <div className="search">
      <input
        value={q}
        placeholder="Search sector, area or society… (e.g. 48, DLF, Sobha)"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && results[0] && pick(results[0].s.id)}
        aria-label="Search sectors"
      />
      {open && q && (
        <ul className="suggest">
          {results.length === 0 && <li className="muted">Not covered yet. v1 has {SECTORS.length} popular sectors.</li>}
          {results.map(({ s, society }) => (
            <li key={s.id} onMouseDown={() => pick(s.id)}>
              <b>{s.name}</b>
              <span className="muted"> · {society ? `🏢 ${society}` : s.zone}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
