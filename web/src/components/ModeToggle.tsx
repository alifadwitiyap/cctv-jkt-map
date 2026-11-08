import { useEffect, useRef, useState } from "react";

export type ViewMode = "overview" | "map";

const MODE_KEY = "cctv-view-mode";

/** Default to overview for new visitors; remember the last mode. */
export function initialMode(): ViewMode {
  if (typeof window === "undefined") return "overview";
  return window.localStorage.getItem(MODE_KEY) === "map" ? "map" : "overview";
}

export function persistMode(mode: ViewMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* storage unavailable — ignore */
  }
}

interface ModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const overviewRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const btn = mode === "map" ? mapRef.current : overviewRef.current;
    if (btn) setOffset(btn.offsetLeft);
  }, [mode]);

  return (
    <div className="mode-toggle" role="tablist" aria-label="Mode tampilan">
      <span
        className="mode-toggle__indicator"
        aria-hidden="true"
        style={{ transform: `translateX(${offset}px)` }}
      />
      <button
        ref={overviewRef}
        type="button"
        role="tab"
        aria-selected={mode === "overview"}
        className={`mode-toggle__btn ${mode === "overview" ? "is-active" : ""}`}
        onClick={() => onChange("overview")}
      >
        Sorotan
      </button>
      <button
        ref={mapRef}
        type="button"
        role="tab"
        aria-selected={mode === "map"}
        className={`mode-toggle__btn ${mode === "map" ? "is-active" : ""}`}
        onClick={() => onChange("map")}
      >
        Peta
      </button>
    </div>
  );
}
