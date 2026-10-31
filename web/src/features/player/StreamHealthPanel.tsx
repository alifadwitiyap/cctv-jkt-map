import type { HealthState } from "./types";

export interface StreamHealthPanelProps {
  state: HealthState;
  cameraName: string;
  fallbackUrl: string;
  onRetry: () => void;
}

const ERROR_LIKE = new Set<string>(["manifest-error", "decode-error", "disconnected"]);

/**
 * Renders live diagnostics for the active stream: status, time-to-first-frame,
 * buffering episodes, retry count, error detail, a Retry button while the
 * failure is transient, and a fallback link to the official source once the
 * retry budget is exhausted (terminal).
 */
export function StreamHealthPanel({ state, cameraName, fallbackUrl, onRetry }: StreamHealthPanelProps) {
  const ttff = state.firstFrameMs === null ? "—" : `${Math.round(state.firstFrameMs)}ms`;
  const showRetry = !state.terminal && ERROR_LIKE.has(state.status);

  return (
    <section className="health-inspector" aria-label={`Stream health for ${cameraName}`}>
      <header className="health-inspector__header">
        <h3 className="health-inspector__title">{cameraName}</h3>
        <span className={`health-inspector__status health-inspector__status--${state.status}`} role="status" data-testid="health-status">
          {state.status}
        </span>
      </header>

      <dl className="health-inspector__metrics">
        <div className="health-inspector__metric">
          <dt>First frame</dt>
          <dd data-testid="ttff">{ttff}</dd>
        </div>
        <div className="health-inspector__metric">
          <dt>Buffering</dt>
          <dd data-testid="buffering-count">{state.bufferingCount}</dd>
        </div>
        <div className="health-inspector__metric">
          <dt>Retries</dt>
          <dd data-testid="retry-count">{state.retryAttempt}</dd>
        </div>
      </dl>

      {state.error && (
        <div className="health-inspector__error" role="alert" data-testid="error-detail">
          <span className="health-inspector__error-stage">{state.error.stage}:</span> {state.error.message}
        </div>
      )}

      {showRetry && (
        <button type="button" className="health-inspector__retry" onClick={onRetry} data-testid="retry-button">
          Retry
        </button>
      )}

      {state.terminal && (
        <a className="health-inspector__fallback" href={fallbackUrl} target="_blank" rel="noreferrer" data-testid="fallback-link">
          Open official source
        </a>
      )}
    </section>
  );
}
