import { useCallback, useEffect, useRef, useState } from "react";

export type AqiLevel = "good" | "moderate" | "unhealthy-sensitive" | "unhealthy" | "very-unhealthy";

export interface AirQualityReading {
  usAqi: number;
  level: AqiLevel;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  fetchedAt: number;
}

/**
 * Air-quality indicator from Open-Meteo Air Quality API
 * (free, no API key, CORS-enabled).
 *
 * This is measured/modeled ambient air quality at a coordinate — it is NOT a
 * live traffic count. UI copy must not claim traffic.
 */
const REFRESH_MS = 10 * 60 * 1000;

export function aqiLevel(aqi: number): AqiLevel {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy-sensitive";
  if (aqi <= 200) return "unhealthy";
  return "very-unhealthy";
}

export const AQI_LABEL: Record<AqiLevel, string> = {
  good: "Baik",
  moderate: "Sedang",
  "unhealthy-sensitive": "Tidak sehat (sensitif)",
  unhealthy: "Tidak sehat",
  "very-unhealthy": "Sangat tidak sehat",
};

export function useAirQuality(
  lat: number | null,
  lng: number | null,
): {
  data: AirQualityReading | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<AirQualityReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, { data: AirQualityReading; at: number }>>({});

  const refresh = useCallback(() => {
    if (lat == null || lng == null) return;
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const hit = cache.current[key];
    if (hit && Date.now() - hit.at < REFRESH_MS) {
      setData(hit.data);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    fetch(
      "https://air-quality-api.open-meteo.com/v1/air-quality?" +
        new URLSearchParams({
          latitude: String(lat),
          longitude: String(lng),
          current: "pm10,pm2_5,nitrogen_dioxide,carbon_monoxide,ozone,us_aqi",
          timezone: "Asia/Jakarta",
        }),
      { signal: ctrl.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        const c = j.current ?? {};
        const aqi = Number(c.us_aqi ?? 0);
        const reading: AirQualityReading = {
          usAqi: aqi,
          level: aqiLevel(aqi),
          pm25: Number(c.pm2_5 ?? 0),
          pm10: Number(c.pm10 ?? 0),
          no2: Number(c.nitrogen_dioxide ?? 0),
          o3: Number(c.ozone ?? 0),
          co: Number(c.carbon_monoxide ?? 0),
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
  }, [lat, lng]);

  useEffect(() => {
    setData(null);
    return refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  return { data, loading, error, refresh };
}
