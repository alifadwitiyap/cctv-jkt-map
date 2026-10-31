import type { Corridor, CorridorPoint, CorridorPreset } from "./types";

export const MIN_POINTS = 2;

export interface CorridorState {
  points: Corridor;
  presetId: string | null;
  finished: boolean;
}

export const initialCorridorState: CorridorState = {
  points: [],
  presetId: null,
  finished: false,
};

export type CorridorAction =
  | { type: "addPoint"; point: CorridorPoint }
  | { type: "undo" }
  | { type: "clear" }
  | { type: "finish" }
  | { type: "selectPreset"; preset: CorridorPreset };

const DISTINCT_COUNT = (points: Corridor): number => {
  const seen = new Set<string>();
  for (const p of points) seen.add(`${p.lat},${p.lng}`);
  return seen.size;
};

export function corridorReducer(
  state: CorridorState,
  action: CorridorAction,
): CorridorState {
  switch (action.type) {
    case "addPoint":
      return { ...state, points: [...state.points, action.point], finished: false };

    case "undo":
      if (state.points.length === 0) return state;
      return { ...state, points: state.points.slice(0, -1), finished: false };

    case "clear":
      return { ...state, points: [], presetId: null, finished: false };

    case "finish":
      if (DISTINCT_COUNT(state.points) < MIN_POINTS) return state;
      return { ...state, finished: true };

    case "selectPreset": {
      const preset = action.preset;
      const finished = DISTINCT_COUNT(preset.path) >= MIN_POINTS;
      return { points: [...preset.path], presetId: preset.id, finished };
    }

    default:
      return state;
  }
}
