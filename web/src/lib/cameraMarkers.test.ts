import { describe, expect, it } from "vitest";
import { CAMERAS, MARKERS, toMarkers } from "./cameraMarkers";

describe("cameraMarkers", () => {
  it("loads 52 cameras from data/cameras.json", () => {
    expect(CAMERAS).toHaveLength(52);
  });

  it("derives one marker per camera with valid coordinates", () => {
    const markers = toMarkers(CAMERAS);
    expect(markers).toHaveLength(52);
    for (const marker of markers) {
      expect(typeof marker.lat).toBe("number");
      expect(typeof marker.lng).toBe("number");
      // All cameras are within Jakarta (lng ~ 106.x).
      expect(marker.lng).toBeGreaterThan(100);
      expect(marker.lng).toBeLessThan(120);
      expect(marker.id).toMatch(/^cam_/);
      expect(marker.name.length).toBeGreaterThan(0);
    }
  });

  it("exposes the marker list consumed by the map layer", () => {
    expect(MARKERS).toHaveLength(CAMERAS.length);
    expect(MARKERS[0]).toEqual({
      id: CAMERAS[0].id,
      name: CAMERAS[0].name,
      lat: CAMERAS[0].lat,
      lng: CAMERAS[0].lng,
      confidence: CAMERAS[0].confidence,
    });
  });
});
