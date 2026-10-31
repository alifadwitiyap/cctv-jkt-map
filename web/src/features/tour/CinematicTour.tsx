import { useCallback, useState } from "react";
import type { CameraMarker } from "../../lib/cameraMarkers";
import type { ParsedCamera } from "../../lib/wasm/contracts";

export interface CinematicTourProps {
  cameras: ParsedCamera[];
  onSelect: (marker: CameraMarker) => void;
}

/**
 * Compact prev/next camera controls. No extra chrome — just two small buttons
 * that jump between cameras and open the live stream.
 */
export function CinematicTour({ cameras, onSelect }: CinematicTourProps) {
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (offset: number) => {
      if (cameras.length === 0) return;
      const idx = ((index + offset) % cameras.length + cameras.length) % cameras.length;
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
    [cameras, index, onSelect],
  );

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
