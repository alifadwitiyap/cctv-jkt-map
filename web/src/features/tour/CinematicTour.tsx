import { useCallback, useState } from "react";
import type { CameraMarker } from "../../lib/cameraMarkers";
import type { ParsedCamera } from "../../lib/wasm/contracts";

export interface CinematicTourProps {
  cameras: ParsedCamera[];
  onSelect: (marker: CameraMarker) => void;
}

/**
 * Minimal "Next Camera" control: advances to the next camera and opens it.
 * No play/pause/timer — a single purpose-built button.
 */
export function CinematicTour({ cameras, onSelect }: CinematicTourProps) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    if (cameras.length === 0) return;
    const idx = (index + 1) % cameras.length;
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
  }, [cameras, index, onSelect]);

  if (cameras.length === 0) return null;

  return (
    <button type="button" className="tour-next" data-testid="tour-next" onClick={next}>
      <span className="tour-next__label">Next Camera</span>
      <span className="tour-next__name">
        {cameras[(index + 1) % cameras.length]?.name ?? "—"}
      </span>
    </button>
  );
}
