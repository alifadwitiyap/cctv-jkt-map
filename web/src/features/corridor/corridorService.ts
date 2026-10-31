import type {
  CorridorRequest,
  CorridorResult,
  ParsedCamera,
} from "../../lib/wasm/contracts";
import { haversineM, inspectCorridor as defaultInspectCorridor } from "../../lib/wasm";
import type { Corridor, CorridorHit } from "./types";

export type InspectCorridorFn = (input: CorridorRequest) => CorridorResult[];

interface BestHit {
  distanceM: number;
  segmentIndex: number;
}

function alongOffsetAt(path: Corridor, segmentIndex: number): number {
  let offset = 0;
  for (let i = 0; i < segmentIndex; i++) {
    offset += haversineM(
      [path[i].lat, path[i].lng],
      [path[i + 1].lat, path[i + 1].lng],
    );
  }
  return offset;
}

/**
 * Inspect a completed corridor path (>= 2 points) within a radius and return
 * enriched hits, sorted by distance from the path (closest first).
 *
 * Runs the contract's `inspectCorridor` per polyline segment, merges results
 * (keeping the closest match per camera), and joins camera metadata. The
 * default `inspect` is the WASM mock; the real WASM replaces it at fan-in.
 */
export function inspectCorridorService(
  cameras: ParsedCamera[],
  path: Corridor,
  radiusM: number,
  inspect: InspectCorridorFn = defaultInspectCorridor,
): CorridorHit[] {
  if (path.length < 2 || cameras.length === 0) return [];

  const cameraById = new Map(cameras.map((c) => [c.id, c]));
  const best = new Map<string, BestHit>();

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const results = inspect({
      from: [a.lat, a.lng],
      to: [b.lat, b.lng],
      radiusM,
    });
    for (const result of results) {
      const current = best.get(result.cameraId);
      if (!current || result.distanceM < current.distanceM) {
        best.set(result.cameraId, {
          distanceM: result.distanceM,
          segmentIndex: i,
        });
      }
    }
  }

  const hits: CorridorHit[] = [];
  for (const [cameraId, hit] of best) {
    const camera = cameraById.get(cameraId);
    if (!camera) continue;
    hits.push({
      camera,
      distanceToPath: hit.distanceM,
      distanceAlongPath: alongOffsetAt(path, hit.segmentIndex),
    });
  }

  hits.sort((x, y) => x.distanceToPath - y.distanceToPath);
  return hits;
}
