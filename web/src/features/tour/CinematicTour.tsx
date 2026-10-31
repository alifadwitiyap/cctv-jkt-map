import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraMarker } from "../../lib/cameraMarkers";
import type { ParsedCamera } from "../../lib/wasm/contracts";

export interface CinematicTourProps {
  cameras: ParsedCamera[];
  onSelect: (marker: CameraMarker) => void;
  reducedMotion: boolean;
}

const DEFAULT_INTERVAL_MS = 5000;

/**
 * Cinematic Tour: auto-advances through cameras (flyTo + opens stream), with
 * Play/Pause + Prev/Next. Loops. Action reduced-motion, interval is ignored
 * (no auto-jump) and playback is manual.
 */
export function CinematicTour({ cameras, onSelect, reducedMotion }: CinematicTourProps) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  const total = cameras.length;

  const goTo = useCallback(
    (i: number) => {
      if (total === 0) return;
      const idx = ((i % total) + total) % total;
      setIndex(idx);
      const cam = cameras[idx];
      if (cam) {
        onSelect({
          id: cam.id,
          name: cam.name,
          lat: cam.lat,
          lng: cam.lng,
          confidence: cam.confidence,
        });
      }
    },
    [cameras, total, onSelect],
  );

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }, []);

  const start = useCallback(() => {
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const tick = () => {
      goTo(indexRef.current + 1);
      timerRef.current = setTimeout(tick, DEFAULT_INTERVAL_MS);
    };
    timerRef.current = setTimeout(tick, DEFAULT_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, reducedMotion, goTo]);

  // when cameras change, clamp index
  useEffect(() => {
    if (index >= total && total > 0) setIndex(total - 1);
  }, [total, index]);

  if (total === 0) return null;

  return (
    <section className="tour" aria-label="Cinematic tour">
      <header className="tour__header">
        <span className="tour__title">Cinematic Tour</span>
        <span className="tour__pos">
          {index + 1}/{total}
        </span>
      </header>
      <div className="tour__controls">
        <button
          type="button"
          className="tour__btn"
          onClick={() => (playing ? stop() : start())}
          aria-pressed={playing}
          data-testid="tour-play"
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          type="button"
          className="tour__btn"
          onClick={() => goTo(index - 1)}
          disabled={reducedMotion && !playing}
          data-testid="tour-prev"
        >
          ‹ Prev
        </button>
        <button
          type="button"
          className="tour__btn"
          onClick={() => goTo(index + 1)}
          disabled={reducedMotion && !playing}
          data-testid="tour-next"
        >
          Next ›
        </button>
      </div>
      <div className="tour__current" data-testid="tour-current">
        {cameras[index]?.name ?? "—"}
      </div>
    </section>
  );
}
