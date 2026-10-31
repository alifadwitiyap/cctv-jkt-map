import type { ParsedCamera } from "./wasm/contracts";
import camerasData from "../data/cameras.json";

export interface CameraMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  confidence: ParsedCamera["confidence"];
}

/** Cameras loaded from data/cameras.json (52 entries). */
export const CAMERAS: ParsedCamera[] = camerasData as ParsedCamera[];

/** Derive lightweight map markers from raw camera records. */
export function toMarkers(cameras: readonly ParsedCamera[]): CameraMarker[] {
  return cameras.map((c) => ({
    id: c.id,
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    confidence: c.confidence,
  }));
}

/** Marker list consumed by the map layer. */
export const MARKERS: CameraMarker[] = toMarkers(CAMERAS);
