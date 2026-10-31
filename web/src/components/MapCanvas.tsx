import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { MARKERS } from "../lib/cameraMarkers";
import type { CameraMarker } from "../lib/cameraMarkers";

interface MapCanvasProps {
  selectedId: string | null;
  reducedMotion: boolean;
  onSelect: (marker: CameraMarker) => void;
}

// MapLibre uses [lng, lat] order.
const JKT_CENTER: [number, number] = [106.82, -6.2];
const FLY_ZOOM = 15;
const FLY_DURATION = 1800;

export default function MapCanvas({ selectedId, reducedMotion, onSelect }: MapCanvasProps) {
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

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      aria-label="Interactive CCTV map of Jakarta"
      role="application"
    />
  );
}
