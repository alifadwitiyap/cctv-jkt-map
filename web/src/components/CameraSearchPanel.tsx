import { useMemo, useState } from "react";
import type { ParsedCamera } from "../lib/wasm/contracts";
import type { CameraMarker } from "../lib/cameraMarkers";

export interface CameraSearchPanelProps {
  cameras: ParsedCamera[];
  selectedId: string | null;
  onSelect: (marker: CameraMarker) => void;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Search + list of cameras. Typeahead filters by name/location; clicking a
 * row selects the camera (flyTo + opens player) via `onSelect`, same path as
 * marker clicks.
 */
export function CameraSearchPanel({ cameras, selectedId, onSelect }: CameraSearchPanelProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return cameras;
    const tokens = q.split(" ");
    return cameras.filter((c) => {
      const hay = normalize(`${c.name} ${c.id}`);
      return tokens.every((t) => hay.includes(t));
    });
  }, [query, cameras]);

  return (
    <section className="camera-search" aria-label="Search cameras">
      <input
        className="camera-search__input"
        type="search"
        placeholder="Cari nama lokasi / ID site…"
        aria-label="Cari lokasi CCTV"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="camera-search__list" data-testid="camera-search-list">
        {results.map((cam) => {
          const selected = cam.id === selectedId;
          return (
            <li key={cam.id}>
              <button
                type="button"
                className="camera-search__item"
                data-selected={selected || undefined}
                aria-current={selected ? "true" : undefined}
                onClick={() =>
                  onSelect({
                    id: cam.id,
                    name: cam.name,
                    lat: cam.lat,
                    lng: cam.lng,
                    confidence: cam.confidence,
                  })
                }
              >
                <span className="camera-search__name">{cam.name}</span>
                <span className="camera-search__id">{cam.id}</span>
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="camera-search__empty">Tidak ada kamera yang cocok.</li>
        )}
      </ul>
    </section>
  );
}
