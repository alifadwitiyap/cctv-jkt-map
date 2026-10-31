import { useCallback, useMemo, useReducer, useState } from "react";
import Header from "./components/Header";
import MapCanvas from "./components/MapCanvas";
import PlayerPanel from "./components/PlayerPanel";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { CAMERAS } from "./lib/cameraMarkers";
import type { CameraMarker } from "./lib/cameraMarkers";
import type { PlayerEvent } from "./lib/playerEvents";
import { initialPanelState, panelReducer } from "./state/panelReducer";
import { CameraSearchPanel } from "./components/CameraSearchPanel";
import { CinematicTour } from "./features/tour/CinematicTour";

function App() {
  const [panel, dispatch] = useReducer(panelReducer, initialPanelState);
  const [flyToTarget, setFlyToTarget] = useState<CameraMarker | null>(null);
  const reducedMotion = useReducedMotion();

  // Active camera (drives the map highlight, the player, and the health panel).
  const selectedCamera = useMemo(() => {
    if (!panel.cameraId) return null;
    return CAMERAS.find((camera) => camera.id === panel.cameraId) ?? null;
  }, [panel.cameraId]);

  const handleSelect = useCallback((marker: CameraMarker) => {
    setFlyToTarget(marker);
    dispatch({ type: "open", cameraId: marker.id, name: marker.name });
  }, []);

  const handleClose = useCallback(() => {
    dispatch({ type: "close" });
  }, []);

  // Integration seam: player events (kept minimal, wired to health if needed).
  const handlePlayerEvent = useCallback((_event: PlayerEvent) => {}, []);

  return (
    <div className="app">
      <Header />
      <main className="app__viewport">
        <div className="left-rail">
          <CameraSearchPanel
            cameras={CAMERAS}
            selectedId={panel.cameraId}
            onSelect={handleSelect}
          />
        </div>
        <MapCanvas
          selectedId={panel.cameraId}
          reducedMotion={reducedMotion}
          onSelect={handleSelect}
          flyToTarget={flyToTarget}
        />
        <PlayerPanel
          open={panel.open}
          camera={selectedCamera}
          reducedMotion={reducedMotion}
          onEvent={handlePlayerEvent}
          onClose={handleClose}
        />
        <div className="corridor-dock">
          <CinematicTour
            cameras={CAMERAS}
            onSelect={handleSelect}
            reducedMotion={reducedMotion}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
