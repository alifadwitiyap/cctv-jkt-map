/**
 * FROZEN TypeScript contract for the Rust WASM core.
 * The Rust crate `cctv-core` will export functions matching the
 * signature types below at fan-in. Do not change these shapes without
 * updating the Rust core.
 */

export type Confidence = "high" | "medium" | "low";

export interface ParsedCamera {
  id: string;
  name: string;
  streamUrl: string;
  streamPath: string;
  lat: number;
  lng: number;
  confidence: Confidence;
}

export interface ClusterResult {
  count: number;
  lat: number;
  lng: number;
  cameras: string[];
}

export interface CorridorRequest {
  from: [number, number];
  to: [number, number];
  radiusM: number;
}

export interface CorridorResult {
  cameraId: string;
  distanceM: number;
}

export type ParseCatalog = (html: string) => ParsedCamera[];
export type HaversineM = (
  a: [number, number],
  b: [number, number],
) => number;
export type ClusterMarkers = (
  cameras: ParsedCamera[],
  zoom: number,
) => ClusterResult[];
export type InspectCorridor = (input: CorridorRequest) => CorridorResult[];
