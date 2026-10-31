import type { Corridor, CorridorPoint } from "./types";

export interface PathBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const MIN_SPAN = 0.0001;

export function pathBounds(path: Corridor): PathBounds {
  if (path.length === 0) {
    return { minLat: -1, maxLat: 1, minLng: -1, maxLng: 1 };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of path) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  if (minLat === maxLat) {
    minLat -= MIN_SPAN;
    maxLat += MIN_SPAN;
  }
  if (minLng === maxLng) {
    minLng -= MIN_SPAN;
    maxLng += MIN_SPAN;
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function latLngToSvg(
  point: CorridorPoint,
  bounds: PathBounds,
  width: number,
  height: number,
): { x: number; y: number } {
  const x = ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
  const y = ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * height;
  return { x, y };
}

export function svgToLatLng(
  px: number,
  py: number,
  bounds: PathBounds,
  width: number,
  height: number,
): CorridorPoint {
  const lng = bounds.minLng + (px / width) * (bounds.maxLng - bounds.minLng);
  const lat = bounds.maxLat - (py / height) * (bounds.maxLat - bounds.minLat);
  return { lat, lng };
}
