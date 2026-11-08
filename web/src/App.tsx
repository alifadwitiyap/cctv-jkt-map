import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Header from "./components/Header";
import MapCanvas from "./components/MapCanvas";
import PlayerPanel from "./components/PlayerPanel";
import ModeToggle, { initialMode, persistMode, type ViewMode } from "./components/ModeToggle";
import Overview from "./components/Overview";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { CAMERAS } from "./lib/cameraMarkers";
import type { CameraMarker } from "./lib/cameraMarkers";
import type { PlayerEvent } from "./lib/playerEvents";
import { initialPanelState, panelReducer } from "./state/panelReducer";
import { CameraSearchPanel } from "./components/CameraSearchPanel";
import { CinematicTour } from "./features/tour/CinematicTour";
import { overviewCameras } from "./features/overview/featured";
import { prewarmHosts } from "./lib/prewarm";

function App() {
  // `panel.cameraId` = the PLAYING camera (drives the player).
  const [panel, dispatch] = useReducer(panelReducer, initialPanelState);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<CameraMarker | null>(null);
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const places = useMemo(() => overviewCameras(), []);

  // Warm the camera host's TLS connection on app mount so the six live cards
  // share a pooled connection instead of six cold handshakes (~48s each).
  useEffect(() => {
    prewarmHosts();
  }, []);

  useEffect(() => persistMode(mode), [mode]);

  // Camera currently playing (drives the player panel).
  const playingCamera = useMemo(() => {
    if (!panel.cameraId) return null;
    return CAMERAS.find((camera) => camera.id === panel.cameraId) ?? null;
  }, [panel.cameraId]);

  // Marker click / list row / tour: fly + select + play (existing behaviour).
  const handleSelect = useCallback((marker: CameraMarker) => {
    setHighlightId(marker.id);
    setFlyToTarget(marker);
    dispatch({ type: "open", cameraId: marker.id, name: marker.name });
  }, []);

  const handleClose = useCallback(() => {
    // Close the player but KEEP highlightId so the selection survives mode
    // switches (identity carried across modes).
    dispatch({ type: "close" });
  }, []);

  // "Tonton" from an overview card: open the player DIRECTLY — no map fly,
  // no cinematic zoom. The map is not even initialized in overview mode.
  const handleWatch = useCallback((camera: CameraMarker) => {
    setHighlightId(camera.id);
    dispatch({ type: "open", cameraId: camera.id, name: camera.name });
  }, []);

  // "Lihat di peta" (small map logo on a card): switch to map mode, carry the
  // identity (highlight the marker) and fly to it with the cinematic flyTo.
  const handleShowOnMap = useCallback((camera: CameraMarker) => {
    setHighlightId(camera.id);
    setMode("map");
    setFlyToTarget(camera);
  }, []);

  // Manual mode toggle: a fresh map view (no stale fly command).
  const handleModeChange = useCallback((next: ViewMode) => {
    setMode(next);
    if (next === "map") setFlyToTarget(null);
  }, []);

  // Integration seam: player events (kept minimal, wired to health if needed).
  const handlePlayerEvent = useCallback((_event: PlayerEvent) => {}, []);

  return (
    <div className={`app ${panel.open && playingCamera ? "app--has-player" : ""}`}>
      <Header>
        <ModeToggle mode={mode} onChange={handleModeChange} />
      </Header>
      <main className="app__viewport">
        {mode === "overview" ? (
          <Overview
            places={places}
            onWatch={handleWatch}
            onShowOnMap={handleShowOnMap}
          />
        ) : (
          <>
            <div className="left-rail">
              <CameraSearchPanel
                cameras={CAMERAS}
                selectedId={highlightId}
                onSelect={handleSelect}
              />
            </div>
            <MapCanvas
              selectedId={highlightId}
              reducedMotion={reducedMotion}
              onSelect={handleSelect}
              flyToTarget={flyToTarget}
            />
            <div className="corridor-dock">
              <CinematicTour
                cameras={CAMERAS}
                onSelect={handleSelect}
                reducedMotion={reducedMotion}
              />
            </div>
          </>
        )}
        <PlayerPanel
          open={panel.open}
          camera={playingCamera}
          reducedMotion={reducedMotion}
          onEvent={handlePlayerEvent}
          onClose={handleClose}
        />
      </main>
    </div>
  );
}

export default App;
