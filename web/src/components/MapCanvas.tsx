import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { MARKERS } from "../lib/cameraMarkers";
import type { CameraMarker } from "../lib/cameraMarkers";
import { flowTileUrl } from "../features/traffic/useTrafficFlow";

interface MapCanvasProps {
  selectedId: string | null;
  reducedMotion: boolean;
  onSelect: (marker: CameraMarker) => void;
  /** When set (a new camera), the map flies to it. Drives list-click panning. */
  flyToTarget: CameraMarker | null;
  /** Show the TomTom traffic flow raster overlay. */
  showTraffic?: boolean;
}

const TRAFFIC_SOURCE = "tomtom-flow";
const TRAFFIC_LAYER = "tomtom-flow-layer";

// MapLibre uses [lng, lat] order.
const JKT_CENTER: [number, number] = [106.82, -6.2];
const FLY_ZOOM = 15;
const FLY_DURATION = 1800;

export default function MapCanvas({ selectedId, reducedMotion, onSelect, flyToTarget, showTraffic = false }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    // Point MapLibre at the worker file Vite emitted for us (otherwise it
    // 404s on the default relative worker URL).
    setWorkerUrl(workerUrl);

    const map = new maplibregl.Map({
      container,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: JKT_CENTER,
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    MARKERS.forEach((marker, index) => {
      const el = document.createElement("div");
      el.className = "cam-marker";
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", `CCTV camera ${marker.name}`);
      el.title = marker.name;
      el.style.animationDelay = `${Math.min(index * 30, 1500)}ms`;

      const focus = () => {
        map.flyTo({
          center: [marker.lng, marker.lat],
          zoom: FLY_ZOOM,
          duration: reducedMotion ? 0 : FLY_DURATION,
          essential: true,
        });
        onSelect(marker);
      };

      el.addEventListener("click", focus);
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          focus();
        }
      });

      const maplibreMarker = new maplibregl.Marker({ element: el })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
      markerRefs.current.set(marker.id, maplibreMarker);
    });

    return () => {
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [reducedMotion, onSelect]);

  useEffect(() => {
    if (!selectedId) return;
    markerRefs.current.forEach((marker, id) => {
      marker.getElement().classList.toggle("is-active", id === selectedId);
    });
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    map.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: FLY_ZOOM,
      duration: reducedMotion ? 0 : FLY_DURATION,
      essential: true,
    });
  }, [flyToTarget, reducedMotion]);

  // TomTom traffic flow raster overlay (toggleable).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const tileUrl = flowTileUrl();
      if (!tileUrl) return;

      if (!showTraffic) {
        if (map.getLayer(TRAFFIC_LAYER)) map.removeLayer(TRAFFIC_LAYER);
        if (map.getSource(TRAFFIC_SOURCE)) map.removeSource(TRAFFIC_SOURCE);
        return;
      }
      if (map.getLayer(TRAFFIC_LAYER)) return; // already on

      if (!map.getSource(TRAFFIC_SOURCE)) {
        map.addSource(TRAFFIC_SOURCE, {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
          attribution: "Traffic © TomTom",
        });
      }
      // Add on TOP of the base style: inserting before the first symbol layer
      // buries the raster under opaque landuse/road layers.
      map.addLayer({
        id: TRAFFIC_LAYER,
        type: "raster",
        source: TRAFFIC_SOURCE,
        paint: {
          "raster-opacity": 0.85,
          "raster-fade-duration": 0,
        },
      });
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);

    return () => {
      if (!map.getLayer(TRAFFIC_LAYER)) return;
      try {
        map.removeLayer(TRAFFIC_LAYER);
        if (map.getSource(TRAFFIC_SOURCE)) map.removeSource(TRAFFIC_SOURCE);
      } catch {
        /* map may be torn down */
      }
    };
  }, [showTraffic]);

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      aria-label="Interactive CCTV map of Jakarta"
      role="application"
    />
  );
}
