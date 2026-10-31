import type { CorridorHit } from "./types";

export interface CorridorResultsProps {
  hits: CorridorHit[];
  selectedCameraId?: string | null;
  onSelectCamera?: (cameraId: string) => void;
}

function formatMeters(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function CorridorResults({
  hits,
  selectedCameraId,
  onSelectCamera,
}: CorridorResultsProps) {
  return (
    <ol className="corridor-results" data-testid="corridor-results">
      {hits.map((hit) => {
        const selected = hit.camera.id === selectedCameraId;
        return (
          <li
            key={hit.camera.id}
            data-testid={`hit-${hit.camera.id}`}
            aria-current={selected ? "true" : undefined}
            className={selected ? "is-selected" : ""}
            role="button"
            tabIndex={0}
            onClick={() => onSelectCamera?.(hit.camera.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectCamera?.(hit.camera.id);
              }
            }}
          >
            <span className="corridor-hit-name">{hit.camera.name}</span>
            <span className="corridor-hit-metrics">
              {formatMeters(hit.distanceToPath)} off-path ·{" "}
              {formatMeters(hit.distanceAlongPath)} along
            </span>
          </li>
        );
      })}
    </ol>
  );
}
