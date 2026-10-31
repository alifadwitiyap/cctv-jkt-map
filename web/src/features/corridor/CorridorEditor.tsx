import type { MouseEvent } from "react";
import { CorridorLayer } from "./CorridorLayer";
import { latLngToSvg, pathBounds, svgToLatLng } from "./corridorGeometry";
import type { Corridor, CorridorPoint, CorridorPreset } from "./types";

export interface CorridorEditorProps {
  path: Corridor;
  canFinish: boolean;
  finished: boolean;
  presets: CorridorPreset[];
  onAddPoint: (point: CorridorPoint) => void;
  onUndo: () => void;
  onClear: () => void;
  onFinish: () => void;
  onSelectPreset: (presetId: string) => void;
  width?: number;
  height?: number;
}

export function CorridorEditor({
  path,
  canFinish,
  finished,
  presets,
  onAddPoint,
  onUndo,
  onClear,
  onFinish,
  onSelectPreset,
  width = 800,
  height = 600,
}: CorridorEditorProps) {
  const bounds = pathBounds(path);
  const vertices = path.map((p) => ({
    point: p,
    x: latLngToSvg(p, bounds, width, height).x,
    y: latLngToSvg(p, bounds, width, height).y,
  }));

  const handleSurfaceClick = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onAddPoint(svgToLatLng(x, y, bounds, width, height));
  };

  return (
    <div className="corridor-editor">
      <div
        data-testid="corridor-editor-surface"
        className="corridor-editor-surface"
        onClick={handleSurfaceClick}
      >
        <CorridorLayer path={path} width={width} height={height} />
        {vertices.map((v, i) => (
          <button
            key={i}
            type="button"
            data-testid={`corridor-vertex-${i}`}
            className="corridor-vertex"
            aria-label={`Vertex ${i + 1}`}
            style={{ left: v.x, top: v.y }}
            onClick={(e) => e.stopPropagation()}
          />
        ))}
      </div>
      <div className="corridor-controls">
        <select
          data-testid="corridor-preset"
          aria-label="Preset corridor"
          onChange={(e) => {
            if (e.target.value) onSelectPreset(e.target.value);
          }}
        >
          <option value="">Presets…</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid="corridor-finish"
          disabled={!canFinish}
          aria-pressed={finished}
          onClick={onFinish}
        >
          Finish
        </button>
        <button type="button" data-testid="corridor-undo" onClick={onUndo}>
          Undo
        </button>
        <button type="button" data-testid="corridor-clear" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
