import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { METRO, SECTORS, sectorById } from "../data/sectors";
import { matchColor, matchScore, type Office, type Weights } from "../lib/score";

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  weights: Weights;
  office: Office;
  pickingOffice: boolean;
  onPickOffice: (lat: number, lng: number) => void;
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

export default function MapView({ selectedId, onSelect, weights, office, pickingOffice, onPickOffice }: Props) {
  return (
    <MapContainer center={[28.45, 77.04]} zoom={12} className={`map ${pickingOffice ? "picking" : ""}`} zoomControl={false}>
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

      {SECTORS.map((s) => {
        const m = matchScore(s, weights, office);
        const sel = s.id === selectedId;
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={sel ? 18 : 13}
            pathOptions={{ color: sel ? "#111827" : "#fff", weight: sel ? 3 : 1.5, fillColor: matchColor(m), fillOpacity: 0.85 }}
            eventHandlers={{ click: () => !pickingOffice && onSelect(s.id) }}
          >
            <Tooltip permanent direction="center" className="sec-label">{shortLabel(s.id)}</Tooltip>
          </CircleMarker>
        );
      })}

      {office && (
        <CircleMarker center={[office.lat, office.lng]} radius={10}
          pathOptions={{ color: "#111827", fillColor: "#f97316", fillOpacity: 1, weight: 3 }}>
          <Tooltip permanent direction="top">🏢 {office.name}</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
