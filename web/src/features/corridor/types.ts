import type { ParsedCamera } from "../../lib/wasm/contracts";

export interface CorridorPoint {
  lat: number;
  lng: number;
}

export type Corridor = CorridorPoint[];

export interface CorridorHit {
  camera: ParsedCamera;
  /** Shortest perpendicular distance from the camera to the corridor path, meters. */
  distanceToPath: number;
  /** Distance along the polyline to the nearest segment start, meters. */
  distanceAlongPath: number;
}

export interface CorridorPreset {
  id: string;
  name: string;
  path: Corridor;
}
