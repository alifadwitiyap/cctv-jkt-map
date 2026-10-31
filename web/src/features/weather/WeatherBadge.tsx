import { useWeather, weatherLabel } from "./useWeather";

export function WeatherBadge() {
  const { data, loading, error, refresh } = useWeather();

  if (loading && !data) {
    return (
      <div className="weather-badge weather-badge--loading" role="status">
        Memuat cuaca…
      </div>
    );
  }
  if (error && !data) {
    return (
      <button type="button" className="weather-badge weather-badge--error" onClick={refresh}>
        ⚠ Cuaca unavailable
      </button>
    );
  }
  if (!data) return null;

  const meta = weatherLabel(data.weatherCode);

  return (
    <button
      type="button"
      className="weather-badge"
      onClick={refresh}
      title={`Diperbarui ${new Date(data.fetchedAt).toLocaleTimeString("id-ID")} · klik untuk refresh`}
      data-testid="weather-badge"
    >
      <span className="weather-badge__icon" aria-hidden>
        {meta.icon}
      </span>
      <span className="weather-badge__body">
        <span className="weather-badge__main">
          {meta.label} · {Math.round(data.temperature)}°C
        </span>
        <span className="weather-badge__sub">
          💧 {data.humidity}% · 🌬 {data.windSpeed} km/j
          {data.precipitationProb > 0 ? ` · 🌧 ${data.precipitationProb}%` : ""}
        </span>
      </span>
    </button>
  );
}
