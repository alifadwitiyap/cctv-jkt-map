import { useMemo } from "react";
import Player from "./Player";
import type { ParsedCamera } from "../lib/wasm/contracts";
import type { PlayerEvent } from "../lib/playerEvents";

interface PlayerPanelProps {
  open: boolean;
  camera: ParsedCamera | null;
  reducedMotion: boolean;
  onEvent?: (event: PlayerEvent) => void;
  onClose: () => void;
}

export default function PlayerPanel({
  open,
  camera,
  reducedMotion,
  onEvent,
  onClose,
}: PlayerPanelProps) {
  const panelClass = useMemo(() => {
    let base = "player-panel";
    if (open) base += " player-panel--open";
    if (reducedMotion) base += " player-panel--no-motion";
    return base;
  }, [open, reducedMotion]);

  return (
    <aside className={panelClass} aria-hidden={!open} aria-label="Live stream player">
      {camera && (
        <>
          <header className="player-panel__header">
            <h2 className="player-panel__title">{camera.name}</h2>
            <button
              type="button"
              className="player-panel__close"
              onClick={onClose}
              aria-label="Close player"
            >
              ×
            </button>
          </header>
          <Player
            cameraId={camera.id}
            cameraName={camera.name}
            streamUrl={camera.streamUrl}
            onEvent={onEvent}
          />
        </>
      )}
    </aside>
  );
}
