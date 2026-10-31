import { latLngToSvg, pathBounds } from "./corridorGeometry";
import type { Corridor } from "./types";

export interface CorridorLayerProps {
  path: Corridor;
  radiusM?: number;
  width?: number;
  height?: number;
}

export function CorridorLayer({
  path,
  radiusM,
  width = 800,
  height = 600,
}: CorridorLayerProps) {
  const linePoints =
    path.length > 0
      ? path
          .map((p) => {
            const svg = latLngToSvg(p, pathBounds(path), width, height);
            return `${svg.x},${svg.y}`;
          })
          .join(" ")
      : "";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="corridor-layer"
      data-testid="corridor-layer"
      aria-hidden="true"
    >
      {radiusM !== undefined && linePoints && (
        <polyline
          data-testid="corridor-buffer"
          points={linePoints}
          className="corridor-buffer"
          fill="none"
          stroke="rgba(29,111,224,0.15)"
          strokeWidth={14}
        />
      )}
      {linePoints && (
        <polyline
          data-testid="corridor-line"
          points={linePoints}
          className="corridor-path"
          fill="none"
          stroke="#1d6fe0"
          strokeWidth={2.5}
        />
      )}
    </svg>
  );
}
