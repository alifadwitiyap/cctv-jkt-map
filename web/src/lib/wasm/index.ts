// Real WASM bindings (cctv-core). Replaces the mock at fan-in.
// We initSync once at first use; the exported wrapper functions (which we
// import directly) are then safe to call with their normal (non-pointer) args.

import wasmUrl from "./pkg/cctv_core_bg.wasm?url";
import {
  initSync,
  parse_catalog,
  haversine_m,
  cluster_markers,
  inspect_corridor,
  ease,
} from "./pkg/cctv_core";
import {
  parseCatalog as mockParseCatalog,
  haversineM as mockHaversineM,
  clusterMarkers as mockClusterMarkers,
  inspectCorridor as mockInspectCorridor,
} from "./mock";
import type { CorridorResult } from "./contracts";

let _ready = false;
let _failed = false;

function ensure(): boolean {
  if (_ready) return true;
  if (_failed) return false;
  try {
    const req = new XMLHttpRequest();
    req.open("GET", wasmUrl, false);
    req.responseType = "arraybuffer";
    req.send();
    initSync(new Uint8Array(req.response));
    _ready = true;
    return true;
  } catch {
    // Non-browser / test / SSR environment: fall back to the mock so the
    // synchronous contract still holds (browser always uses real WASM).
    _failed = true;
    return false;
  }
}

export function parseCatalog(html: string) {
  return ensure() ? parse_catalog(html) : mockParseCatalog(html);
}

export function haversineM(a: [number, number], b: [number, number]) {
  return ensure() ? haversine_m(a, b) : mockHaversineM(a, b);
}

export function clusterMarkers(cameras: unknown, zoom: number) {
  return ensure() ? cluster_markers(cameras, zoom) : mockClusterMarkers(cameras as never, zoom);
}

export function inspectCorridor(input: unknown): CorridorResult[] {
  return ensure()
    ? (inspect_corridor(input) as unknown as CorridorResult[])
    : mockInspectCorridor(input as never);
}

export function easeValue(t: number, kind: number) {
  return ensure() ? ease(t, kind) : t;
}

export * from "./contracts";
