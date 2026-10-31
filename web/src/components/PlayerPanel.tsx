import { useMemo, useRef, useState } from "react";
import Player from "./Player";
import { TrafficFlowPanel } from "../features/traffic/TrafficFlowPanel";
import { AirQualityPanel } from "../features/air/AirQualityPanel";
import { WeatherBadge } from "../features/weather/WeatherBadge";
import type { ParsedCamera } from "../lib/wasm/contracts";
import type { PlayerEvent } from "../lib/playerEvents";

interface PlayerPanelProps {
  open: boolean;
  camera: ParsedCamera | null;
  reducedMotion: boolean;
  onEvent?: (event: PlayerEvent) => void;
  onClose: () => void;
}

const DISMISS_THRESHOLD = 120;

export default function PlayerPanel({
  open,
  camera,
  reducedMotion,
  onEvent,
  onClose,
}: PlayerPanelProps) {
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef<{ pointerId: number; startY: number; startDy: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { pointerId: e.pointerId, startY: e.clientY, startDy: dragY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = Math.max(0, e.clientY - d.startY + d.startDy);
    setDragY(dy);
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (dragY > DISMISS_THRESHOLD) {
      onClose();
    }
    setDragY(0);
  };

  const panelClass = useMemo(() => {
    let base = "player-panel";
    if (open) base += " player-panel--open";
    if (reducedMotion) base += " player-panel--no-motion";
    if (dragY > 0) base += " player-panel--dragging";
    return base;
  }, [open, reducedMotion, dragY]);

  const handleStyle = useMemo(() => {
    if (open && dragY > 0) return { transform: `translateY(${dragY}px)` };
    return undefined;
  }, [open, dragY]);

  return (
    <aside
      className={panelClass}
      aria-hidden={!open}
      aria-label="Live stream player"
      style={handleStyle}
    >
      <div
        className="player-panel__handle"
        role="presentation"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="player-panel__grip" />
      </div>
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
          <div className="player-panel__info">
            <TrafficFlowPanel
              lat={camera.lat}
              lng={camera.lng}
              label={camera.district || undefined}
            />
            <AirQualityPanel
              lat={camera.lat}
              lng={camera.lng}
              label={camera.district || undefined}
            />
            <WeatherBadge />
          </div>
        </>
      )}
    </aside>
  );
}



