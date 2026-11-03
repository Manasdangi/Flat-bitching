import { useEffect, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useShapes } from "../lib/geo";
import { LANDMARKS, METRO, SECTORS, sectorById } from "../data/sectors";
import { matchColor, matchScore, type Office, type Weights } from "../lib/score";

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  weights: Weights;
  office: Office;
  pickingOffice: boolean;
  onPickOffice: (lat: number, lng: number) => void;
  layers: { tech: boolean; hangout: boolean };
};

function FlyTo({ id }: { id: string | null }) {
  const map = useMap();
  useEffect(() => {
    const s = id ? sectorById(id) : null;
    if (s) map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [id, map]);
  return null;
}

function ClickPicker({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => active && onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

const shortLabel = (id: string) => (/^\d/.test(id) ? id.toUpperCase() : "PV");

function FitAll() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(SECTORS.map((s) => [s.lat, s.lng] as [number, number]), { padding: [20, 20] });
  }, [map]);
  return null;
}

function ZoomWatch({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
  return null;
}

export default function MapView({ selectedId, onSelect, weights, office, pickingOffice, onPickOffice, layers }: Props) {
  const [zoom, setZoom] = useState(12);
  const shapes = useShapes();
  const hasShape = new Set(shapes.map((x) => x.sector_id));
  const base = zoom >= 14 ? 15 : zoom >= 13 ? 12 : 9;
  return (
    <MapContainer center={[28.45, 77.04]} zoom={12} className={`map z${Math.min(Math.max(zoom, 11), 14)} ${pickingOffice ? "picking" : ""}`} zoomControl={false}>
      <ZoomWatch onZoom={setZoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitAll />
      <FlyTo id={selectedId} />
      <ClickPicker active={pickingOffice} onPick={onPickOffice} />

      {METRO.map((m) => (
        <CircleMarker key={m.name} center={[m.lat, m.lng]} radius={4}
          pathOptions={{ color: m.line === "Yellow" ? "#ca8a04" : "#0284c7", fillOpacity: 1, weight: 2 }}>
          <Tooltip>🚇 {m.name} ({m.line === "Yellow" ? "Yellow Line" : "Rapid Metro"})</Tooltip>
        </CircleMarker>
      ))}

      {shapes.map((sh) => {
        const sec = sectorById(sh.sector_id);
        if (!sec) return null;
        const color = matchColor(matchScore(sec, weights, office));
        const sel = sh.sector_id === selectedId;
        return (
          <GeoJSON
            key={`${sh.sector_id}-${color}-${sel}`}
            data={sh.geojson}
            style={{ color: sel ? "#111827" : color, weight: sel ? 3 : 1.2, fillColor: color, fillOpacity: sel ? 0.35 : 0.22 }}
            eventHandlers={{ click: () => !pickingOffice && onSelect(sh.sector_id) }}
          />
        );
      })}

      {SECTORS.map((s) => {
        const m = matchScore(s, weights, office);
        const sel = s.id === selectedId;
        const r = hasShape.has(s.id) ? Math.max(base - 3, 7) : base;
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={sel ? r + 4 : r}
            pathOptions={{ color: sel ? "#111827" : "#fff", weight: sel ? 3 : 1.5, fillColor: matchColor(m), fillOpacity: 0.85 }}
            eventHandlers={{ click: () => !pickingOffice && onSelect(s.id) }}
          >
            <Tooltip permanent direction="center" className="sec-label">{shortLabel(s.id)}</Tooltip>
          </CircleMarker>
        );
      })}

      {LANDMARKS.filter((l) => (l.kind === "tech" && layers.tech) || (l.kind === "hangout" && layers.hangout)).map((l) => (
        <CircleMarker key={l.kind + l.name} center={[l.lat, l.lng]} radius={zoom >= 13 ? 8 : 6}
          pathOptions={{ color: "#fff", weight: 1.5, fillColor: l.kind === "tech" ? "#0f172a" : "#db2777", fillOpacity: 0.95 }}>
          <Tooltip direction="top">{l.kind === "tech" ? "💼" : "🎉"} {l.name} · {l.area}</Tooltip>
        </CircleMarker>
      ))}

      {office && (
        <CircleMarker center={[office.lat, office.lng]} radius={10}
          pathOptions={{ color: "#111827", fillColor: "#f97316", fillOpacity: 1, weight: 3 }}>
          <Tooltip permanent direction="top">🏢 {office.name}</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
