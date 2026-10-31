import { useCallback, useEffect, useRef, useState } from "react";

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  precipitationProb: number;
  fetchedAt: number;
}

/** WMO weather codes → short label + emoji-ish glyph. */
const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: "Cerah", icon: "☀️" },
  1: { label: "Cerah berawan", icon: "🌤" },
  2: { label: "Berawan", icon: "⛅" },
  3: { label: "Mendung", icon: "☁️" },
  45: { label: "Kabut", icon: "🌫" },
  48: { label: "Kabut beku", icon: "🌫" },
  51: { label: "Gerimis ringan", icon: "🌦" },
  53: { label: "Gerimis", icon: "🌦" },
  55: { label: "Gerimis deras", icon: "🌧" },
  61: { label: "Hujan ringan", icon: "🌧" },
  63: { label: "Hujan", icon: "🌧" },
  65: { label: "Hujan deras", icon: "🌧" },
  80: { label: "Hujan lokal", icon: "🌦" },
  81: { label: "Hujan lokal deras", icon: "🌧" },
  82: { label: "Badai hujan", icon: "⛈" },
  95: { label: "Badai petir", icon: "⛈" },
};

export function weatherLabel(code: number): { label: string; icon: string } {
  return WMO[code] ?? { label: "—", icon: "🌡" };
}

const REFRESH_MS = 10 * 60 * 1000; // 10 min
const JKT = { lat: -6.2, lng: 106.82 };

export function useWeather(cacheKey = "jkt"): {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, { data: WeatherData; at: number }>>({});

  const refresh = useCallback(() => {
    const now = Date.now();
    const hit = cache.current[cacheKey];
    if (hit && now - hit.at < REFRESH_MS) {
      setData(hit.data);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    fetch(
      "https://api.open-meteo.com/v1/forecast?" +
        new URLSearchParams({
          latitude: String(JKT.lat),
          longitude: String(JKT.lng),
          current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
          hourly: "precipitation_probability",
          timezone: "Asia/Jakarta",
          forecast_days: "1",
        }),
      { signal: ctrl.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        const prob = j.hourly?.precipitation_probability?.[0] ?? 0;
        const w: WeatherData = {
          temperature: j.current?.temperature_2m,
          humidity: j.current?.relative_humidity_2m,
          windSpeed: j.current?.wind_speed_10m,
          weatherCode: j.current?.weather_code ?? 0,
          precipitationProb: prob,
          fetchedAt: Date.now(),
        };
        cache.current[cacheKey] = { data: w, at: Date.now() };
        setData(w);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => ctrl.abort();
  }, [cacheKey]);

  useEffect(() => {
    return refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  return { data, loading, error, refresh };
}
