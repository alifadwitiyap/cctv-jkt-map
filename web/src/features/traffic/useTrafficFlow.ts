import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TomTom Traffic — per-camera density + map flow overlay.
 *
 * SECURITY NOTE: this app is a static site, so the key ships to the browser and
 * is effectively public. Restrict it by referrer in the TomTom dashboard.
 */
const API_KEY = (import.meta.env.VITE_TOMTOM_KEY as string | undefined) ?? "";

export type FlowLevel = "free" | "slow" | "congested" | "jam" | "unknown";

export interface FlowReading {
  /** currentSpeed / freeFlowSpeed, 0..1 (1 = free flow). */
  ratio: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  travelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure: boolean;
  level: FlowLevel;
  fetchedAt: number;
}

export function flowLevel(ratio: number, roadClosure = false): FlowLevel {
  if (roadClosure) return "jam";
  if (ratio >= 0.8) return "free";
  if (ratio >= 0.6) return "slow";
  if (ratio >= 0.35) return "congested";
  return "jam";
}

export const FLOW_LABEL: Record<FlowLevel, string> = {
  free: "Lancar",
  slow: "Melambat",
  congested: "Padat",
  jam: "Macet",
  unknown: "—",
};

const CACHE_MS = 3 * 60 * 1000;

export function useTrafficFlow(
  lat: number | null,
  lng: number | null,
): {
  data: FlowReading | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  enabled: boolean;
} {
  const [data, setData] = useState<FlowReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, { data: FlowReading; at: number }>>({});
  const enabled = Boolean(API_KEY);

  const refresh = useCallback(() => {
    if (!enabled || lat == null || lng == null) return;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const hit = cache.current[key];
    if (hit && Date.now() - hit.at < CACHE_MS) {
      setData(hit.data);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    const url =
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` +
      `?key=${encodeURIComponent(API_KEY)}&point=${lat},${lng}&unit=KMPH`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        const f = j.flowSegmentData ?? {};
        const cur = Number(f.currentSpeed ?? 0);
        const free = Number(f.freeFlowSpeed ?? 0);
        const ratio = free > 0 ? Math.min(1, cur / free) : 0;
        const closure = Boolean(f.roadClosure);
        const reading: FlowReading = {
          ratio,
          currentSpeed: cur,
          freeFlowSpeed: free,
          travelTime: Number(f.currentTravelTime ?? 0),
          freeFlowTravelTime: Number(f.freeFlowTravelTime ?? 0),
          confidence: Number(f.confidence ?? 0),
          roadClosure: closure,
          level: flowLevel(ratio, closure),
          fetchedAt: Date.now(),
        };
        cache.current[key] = { data: reading, at: Date.now() };
        setData(reading);
        setLoading(false);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => ctrl.abort();
  }, [enabled, lat, lng]);

  useEffect(() => {
    setData(null);
    return refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  return { data, loading, error, refresh, enabled };
}

/** Raster tile URL template for the MapLibre flow layer. */
export function flowTileUrl(): string | null {
  if (!API_KEY) return null;
  return (
    `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png` +
    `?key=${encodeURIComponent(API_KEY)}&tileSize=256`
  );
}

export const TOMTOM_ENABLED = Boolean(API_KEY);
