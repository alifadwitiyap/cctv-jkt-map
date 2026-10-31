import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraMarker } from "../../lib/cameraMarkers";
import type { ParsedCamera } from "../../lib/wasm/contracts";

export interface CinematicTourProps {
  cameras: ParsedCamera[];
  onSelect: (marker: CameraMarker) => void;
  /** When reduced-motion is on, auto-play is disabled (manual only). */
  reducedMotion: boolean;
}

const AUTO_INTERVAL_MS = 5000;

/**
 * Compact camera nav: prev / play-pause / next. Auto-advances while playing.
 */
export function CinematicTour({ cameras, onSelect, reducedMotion }: CinematicTourProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  const goTo = useCallback(
    (offset: number) => {
      if (cameras.length === 0) return;
      const idx = ((indexRef.current + offset) % cameras.length + cameras.length) % cameras.length;
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
    [cameras, onSelect],
  );

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
  }, []);

  // auto-advance while playing (unless reduced motion)
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const tick = () => {
      goTo(1);
      timerRef.current = setTimeout(tick, AUTO_INTERVAL_MS);
    };
    timerRef.current = setTimeout(tick, AUTO_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, reducedMotion, goTo]);

  // stop when unmounted
  useEffect(() => stop, [stop]);

  if (cameras.length === 0) return null;

  return (
    <div className="tour-nav" data-testid="tour-nav">
      <button
        type="button"
        className="tour-nav__btn"
        onClick={() => goTo(-1)}
        aria-label="Kamera sebelumnya"
        data-testid="tour-prev"
      >
        ‹
      </button>
      <button
        type="button"
        className="tour-nav__btn tour-nav__play"
        onClick={() => (playing ? stop() : setPlaying(true))}
        aria-pressed={playing}
        aria-label={playing ? "Jeda" : "Putar"}
        data-testid="tour-play"
      >
        {playing ? "⏸" : "▶"}
      </button>
      <span className="tour-nav__pos">
        {index + 1}/{cameras.length}
      </span>
      <button
        type="button"
        className="tour-nav__btn"
        onClick={() => goTo(1)}
        aria-label="Kamera berikutnya"
        data-testid="tour-next"
      >
        ›
      </button>
    </div>
  );
}
