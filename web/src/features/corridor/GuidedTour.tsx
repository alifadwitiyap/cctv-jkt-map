import { useEffect, useMemo, useState } from "react";
import type { CorridorHit } from "./types";

export interface GuidedTourProps {
  hits: CorridorHit[];
  onSelectCamera: (cameraId: string) => void;
  initialIndex?: number;
}

/**
 * Guided tour through corridor hits. Uses the same camera-select mechanism as
 * marker clicks (via `onSelectCamera`). One failing camera never blocks Next.
 * Respects `prefers-reduced-motion` by dropping the motion class.
 */
export function GuidedTour({
  hits,
  onSelectCamera,
  initialIndex = 0,
}: GuidedTourProps) {
  const [index, setIndex] = useState(initialIndex);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    [],
  );

  useEffect(() => {
    if (hits.length === 0) return;
    const target = Math.min(index, hits.length - 1);
    if (target !== index) setIndex(target);
    try {
      onSelectCamera(hits[target].camera.id);
    } catch {
      // a broken camera must never block touring
    }
  }, [index, hits, onSelectCamera]);

  const atStart = index <= 0;
  const atEnd = index >= hits.length - 1;

  return (
    <div
      data-testid="guided-tour"
      className={
        reducedMotion ? "guided-tour--reduced-motion" : "guided-tour"
      }
    >
      <span className="guided-tour-label">
        Camera {hits.length === 0 ? 0 : index + 1}/{hits.length}
      </span>
      <button
        type="button"
        data-testid="tour-prev"
        disabled={hits.length === 0 || atStart}
        onClick={() => setIndex(index - 1)}
      >
        Prev
      </button>
      <button
        type="button"
        data-testid="tour-next"
        disabled={hits.length === 0 || atEnd}
        onClick={() => setIndex(index + 1)}
      >
        Next
      </button>
    </div>
  );
}
