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

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "Tepat",
  medium: "Perkiraan",
  low: "Kasar",
};

/**
 * Search + list of cameras, grouped by location name. A row click selects the
 * camera (flyTo + opens player) via `onSelect` — same path as marker clicks.
 */
export function CameraSearchPanel({ cameras, selectedId, onSelect }: CameraSearchPanelProps) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = normalize(query);
    const tokens = q ? q.split(" ") : [];
    const filtered = !tokens.length
      ? cameras
      : cameras.filter((c) => {
          const hay = normalize(`${c.name} ${c.id}`);
          return tokens.every((t) => hay.includes(t));
        });

    // Group by location = name without the trailing camera badge
    // (either "CCTV-01" or a bare "-C01" / " C01" suffix).
    const strip = (name: string) =>
      name
        .replace(/\s+CCTV-\d+\s*$/i, "")
        .replace(/[- ]C\d+\s*$/i, "")
        .trim();
    const map = new Map<string, ParsedCamera[]>();
    for (const c of filtered) {
      const key = strip(c.name).toLowerCase();
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    const groups = Array.from(map.entries()).map(([, list]) => ({
      key: strip(list[0].name),
      list: list.sort((a, b) => a.id.localeCompare(b.id)),
    }));
    groups.sort((a, b) => a.key.localeCompare(b.key));
    return groups;
  }, [query, cameras]);

  const total = useMemo(() => grouped.reduce((s, g) => s + g.list.length, 0), [grouped]);

  return (
    <section className="camera-search" aria-label="Search cameras">
      <div className="camera-search__head">
        <input
          className="camera-search__input"
          type="search"
          placeholder="Cari nama lokasi / ID site…"
          aria-label="Cari lokasi CCTV"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="camera-search__count">{total} kamera</span>
      </div>
      <ul className="camera-search__list" data-testid="camera-search-list">
        {grouped.map((group) => (
          <li key={group.key} className="camera-search__group">
            <div className="camera-search__group-head">
              <span className="camera-search__group-name">{group.key}</span>
              <span className="camera-search__group-count">{group.list.length}</span>
            </div>
            <ul className="camera-search__group-list">
              {group.list.map((cam) => {
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
                      <span className="camera-search__item-main">
                        <span className="camera-search__name">{cam.name}</span>
                        <span className="camera-search__id">{cam.id}</span>
                      </span>
                      <span className={`camera-search__confidence camera-search__confidence--${cam.confidence}`}>
                        {CONFIDENCE_LABEL[cam.confidence] ?? cam.confidence}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
        {grouped.length === 0 && (
          <li className="camera-search__empty">Tidak ada kamera yang cocok.</li>
        )}
      </ul>
    </section>
  );
}
