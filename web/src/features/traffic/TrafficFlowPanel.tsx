import { FLOW_LABEL, useTrafficFlow } from "./useTrafficFlow";

export interface TrafficFlowPanelProps {
  lat: number | null;
  lng: number | null;
  label?: string;
}

/**
 * Per-camera traffic density from TomTom flowSegmentData
 * (currentSpeed vs freeFlowSpeed on the segment nearest the camera).
 */
export function TrafficFlowPanel({ lat, lng, label }: TrafficFlowPanelProps) {
  const { data, loading, error, refresh, enabled } = useTrafficFlow(lat, lng);

  if (!enabled || lat == null || lng == null) return null;

  if (loading && !data) {
    return (
      <section className="flow-panel" data-testid="flow-panel">
        <header className="flow-panel__head">
          <span className="flow-panel__title">Kepadatan Lalu Lintas</span>
        </header>
        <p className="flow-panel__loading">Memuat…</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="flow-panel" data-testid="flow-panel">
        <header className="flow-panel__head">
          <span className="flow-panel__title">Kepadatan Lalu Lintas</span>
        </header>
        <button type="button" className="flow-panel__retry" onClick={refresh}>
          ⚠ Gagal memuat · coba lagi
        </button>
      </section>
    );
  }

  if (!data) return null;

  const pct = Math.round(data.ratio * 100);

  return (
    <section className="flow-panel" data-testid="flow-panel">
      <header className="flow-panel__head">
        <span className="flow-panel__title">Kepadatan Lalu Lintas</span>
        <span className={`flow-panel__level flow-panel__level--${data.level}`} data-testid="flow-level">
          {FLOW_LABEL[data.level]}
        </span>
      </header>

      <div className="flow-panel__bar" role="img" aria-label={`Kecepatan ${pct}% dari arus bebas`}>
        <div className={`flow-panel__bar-fill flow-panel__bar-fill--${data.level}`} style={{ width: `${pct}%` }} />
      </div>

      <dl className="flow-panel__grid">
        <div>
          <dt>Kecepatan</dt>
          <dd>
            {Math.round(data.currentSpeed)} <small>km/j</small>
          </dd>
        </div>
        <div>
          <dt>Arus bebas</dt>
          <dd>
            {Math.round(data.freeFlowSpeed)} <small>km/j</small>
          </dd>
        </div>
        <div>
          <dt>Waktu tempuh</dt>
          <dd>
            {Math.round(data.travelTime / 60)} <small>mnt</small>
          </dd>
        </div>
      </dl>

      {data.roadClosure && (
        <p className="flow-panel__closure" role="alert">
          ⛔ Jalan ditutup
        </p>
      )}

      <footer className="flow-panel__foot">
        <span>
          {label ? `${label} · ` : ""}
          {new Date(data.fetchedAt).toLocaleTimeString("id-ID")}
        </span>
        <button type="button" className="flow-panel__refresh" onClick={refresh} aria-label="Muat ulang kepadatan">
          ↻
        </button>
      </footer>
    </section>
  );
}
