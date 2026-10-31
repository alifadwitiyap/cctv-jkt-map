import { describe, expect, it } from "vitest";
import {
  latLngToSvg,
  pathBounds,
  svgToLatLng,
} from "../corridorGeometry";

const BOUNDS = { minLat: -6.25, maxLat: -6.18, minLng: 106.79, maxLng: 106.84 };

describe("corridorGeometry", () => {
  it("computes bounds across all path points", () => {
    const bounds = pathBounds([
      { lat: -6.2, lng: 106.8 },
      { lat: -6.24, lng: 106.83 },
    ]);
    expect(bounds.minLat).toBeCloseTo(-6.24, 4);
    expect(bounds.maxLat).toBeCloseTo(-6.2, 4);
    expect(bounds.minLng).toBeCloseTo(106.8, 4);
    expect(bounds.maxLng).toBeCloseTo(106.83, 4);
  });

  it("pads degenerate single-point bounds", () => {
    const bounds = pathBounds([{ lat: -6.2, lng: 106.8 }]);
    expect(bounds.minLat).toBeLessThan(-6.2);
    expect(bounds.maxLat).toBeGreaterThan(-6.2);
    expect(bounds.minLng).toBeLessThan(106.8);
    expect(bounds.maxLng).toBeGreaterThan(106.8);
  });

  it("maps lat/lng to svg coordinates", () => {
    const pt = latLngToSvg({ lat: -6.2, lng: 106.8 }, BOUNDS, 800, 600);
    expect(pt.x).toBeCloseTo(160, 3); // (106.80-106.79)/0.05 * 800
    expect(pt.y).toBeCloseTo(171.4286, 3); // (-6.18 - -6.20)/0.07 * 600
  });

  it("inverts svg coordinates back to lat/lng", () => {
    const p = { lat: -6.2, lng: 106.8 };
    const svg = latLngToSvg(p, BOUNDS, 800, 600);
    const back = svgToLatLng(svg.x, svg.y, BOUNDS, 800, 600);
    expect(back.lat).toBeCloseTo(p.lat, 6);
    expect(back.lng).toBeCloseTo(p.lng, 6);
  });
});
