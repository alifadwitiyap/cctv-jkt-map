import { useCallback, useMemo, useReducer, useState } from "react";
import Header from "./components/Header";
import MapCanvas from "./components/MapCanvas";
import PlayerPanel from "./components/PlayerPanel";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { CAMERAS } from "./lib/cameraMarkers";
import type { CameraMarker } from "./lib/cameraMarkers";
import type { PlayerEvent } from "./lib/playerEvents";
import { initialPanelState, panelReducer } from "./state/panelReducer";
import {
  initialCorridorState,
  corridorReducer,
} from "./features/corridor/corridorReducer";
import { CorridorEditor } from "./features/corridor/CorridorEditor";
import { CorridorResults } from "./features/corridor/CorridorResults";
import { GuidedTour } from "./features/corridor/GuidedTour";
import { CURATED_CORRIDORS } from "./features/corridor/curatedCorridors";
import { inspectCorridorService } from "./features/corridor/corridorService";
import { inspectCorridor } from "./lib/wasm";
import { CameraSearchPanel } from "./components/CameraSearchPanel";
import { CinematicTour } from "./features/tour/CinematicTour";
import { WeatherBadge } from "./features/weather/WeatherBadge";
import { AirQualityPanel } from "./features/air/AirQualityPanel";

const CORRIDOR_RADIUS_M = 1500;

function App() {
  const [panel, dispatch] = useReducer(panelReducer, initialPanelState);
  const [corridor, dispatchCorridor] = useReducer(
    corridorReducer,
    initialCorridorState,
  );
  const [corridorOpen, setCorridorOpen] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<CameraMarker | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
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

  // Corridor results computed through the real WASM (sync) service.
  const corridorHits = useMemo(() => {
    if (!corridor.finished || corridor.points.length < 2) return [];
    try {
      return inspectCorridorService(
        CAMERAS,
        corridor.points,
        CORRIDOR_RADIUS_M,
        inspectCorridor,
      );
    } catch {
      return [];
    }
  }, [corridor.finished, corridor.points]);

  const handleSelectCameraFromCorridor = useCallback(
    (cameraId: string) => {
      const marker = CAMERAS.find((camera) => camera.id === cameraId);
      if (marker) handleSelect(marker);
    },
    [handleSelect],
  );

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
          {panel.open && selectedCamera && (
            <div className="health-dock">
              <AirQualityPanel
                lat={selectedCamera.lat}
                lng={selectedCamera.lng}
                label={selectedCamera.district || undefined}
              />
            </div>
          )}
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
          <div className="dock-row">
            <button
              type="button"
              className="corridor-toggle"
              aria-pressed={tourOpen}
              onClick={() => setTourOpen((v) => !v)}
            >
              {tourOpen ? "Close Tour" : "Cinematic Tour"}
            </button>
            <WeatherBadge />
          </div>
          {tourOpen && (
            <CinematicTour
              cameras={CAMERAS}
              onSelect={handleSelect}
              reducedMotion={reducedMotion}
            />
          )}
          <button
            type="button"
            className="corridor-toggle"
            aria-pressed={corridorOpen}
            onClick={() => setCorridorOpen((v) => !v)}
          >
            {corridorOpen ? "Close Corridor" : "Corridor"}
          </button>
          {corridorOpen && (
            <>
              <CorridorEditor
                path={corridor.points}
                canFinish={corridor.points.length >= 2}
                finished={corridor.finished}
                presets={CURATED_CORRIDORS}
                onAddPoint={(point) =>
                  dispatchCorridor({ type: "addPoint", point })
                }
                onUndo={() => dispatchCorridor({ type: "undo" })}
                onClear={() => dispatchCorridor({ type: "clear" })}
                onFinish={() => dispatchCorridor({ type: "finish" })}
                onSelectPreset={(presetId) => {
                  const preset = CURATED_CORRIDORS.find(
                    (p) => p.id === presetId,
                  );
                  if (preset) dispatchCorridor({ type: "selectPreset", preset });
                }}
              />
              {corridor.finished && (
                <>
                  <CorridorResults
                    hits={corridorHits}
                    selectedCameraId={panel.cameraId}
                    onSelectCamera={handleSelectCameraFromCorridor}
                  />
                  <GuidedTour
                    hits={corridorHits}
                    onSelectCamera={handleSelectCameraFromCorridor}
                  />
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
