import { AQI_LABEL, useAirQuality } from "./useAirQuality";

export interface AirQualityPanelProps {
  /** Camera coordinate, so the reading is local to the selected camera. */
  lat: number | null;
  lng: number | null;
  label?: string;
}

/**
 * Ambient air-quality readout (Open-Meteo Air Quality, free/no key).
 * Copy is deliberately "kualitas udara" — never "kepadatan lalu lintas".
 */
export function AirQualityPanel({ lat, lng, label }: AirQualityPanelProps) {
  const { data, loading, error, refresh } = useAirQuality(lat, lng);

  if (lat == null || lng == null) return null;

  if (loading && !data) {
    return (
      <section className="air-panel" data-testid="air-panel">
        <header className="air-panel__head">
          <span className="air-panel__title">Kualitas Udara</span>
        </header>
        <p className="air-panel__loading">Memuat…</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="air-panel" data-testid="air-panel">
        <header className="air-panel__head">
          <span className="air-panel__title">Kualitas Udara</span>
        </header>
        <button type="button" className="air-panel__retry" onClick={refresh}>
          ⚠ Gagal memuat · coba lagi
        </button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="air-panel" data-testid="air-panel">
      <header className="air-panel__head">
        <span className="air-panel__title">Kualitas Udara</span>
        <span className={`air-panel__level air-panel__level--${data.level}`}>
          {AQI_LABEL[data.level]}
        </span>
      </header>

      <div className="air-panel__aqi">
        <span className="air-panel__aqi-value" data-testid="air-aqi">
          {Math.round(data.usAqi)}
        </span>
        <span className="air-panel__aqi-unit">US AQI</span>
      </div>

      <dl className="air-panel__grid">
        <div>
          <dt>PM2.5</dt>
          <dd>{data.pm25.toFixed(1)}</dd>
        </div>
        <div>
          <dt>PM10</dt>
          <dd>{data.pm10.toFixed(1)}</dd>
        </div>
        <div>
          <dt>NO₂</dt>
          <dd>{data.no2.toFixed(1)}</dd>
        </div>
        <div>
          <dt>O₃</dt>
          <dd>{data.o3.toFixed(1)}</dd>
        </div>
      </dl>

      <footer className="air-panel__foot">
        <span>
          {label ? `${label} · ` : ""}
          µg/m³ · {new Date(data.fetchedAt).toLocaleTimeString("id-ID")}
        </span>
        <button type="button" className="air-panel__refresh" onClick={refresh} aria-label="Muat ulang kualitas udara">
          ↻
        </button>
      </footer>
    </section>
  );
}
