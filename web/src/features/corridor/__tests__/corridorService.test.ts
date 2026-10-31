import { describe, expect, it } from "vitest";
import { inspectCorridorService } from "../corridorService";
import type { CorridorResult, ParsedCamera } from "../../../lib/wasm/contracts";
import { haversineM } from "../../../lib/wasm";

const cam = (id: string, lat = 0, lng = 0): ParsedCamera => ({
  id,
  name: id,
  streamUrl: `https://x/${id}/embed.html`,
  streamPath: id,
  lat,
  lng,
  confidence: "medium",
});

const path = [
  { lat: -6.2, lng: 106.8 },
  { lat: -6.19, lng: 106.81 },
  { lat: -6.18, lng: 106.82 },
];

describe("inspectCorridorService", () => {
  it("returns [] for an incomplete path", () => {
    const hits = inspectCorridorService([cam("c1")], [{ lat: -6.2, lng: 106.8 }], 100);
    expect(hits).toEqual([]);
  });

  it("returns [] when no cameras are provided", () => {
    const hits = inspectCorridorService([], path, 100);
    expect(hits).toEqual([]);
  });

  it("returns [] when the inspect function yields nothing (empty state)", () => {
    const hits = inspectCorridorService([cam("c1"), cam("c2")], path, 100);
    expect(hits).toEqual([]);
  });

  it("returns results sorted by distanceToPath ascending and follows the contract shape", () => {
    const fakeInspect = (): CorridorResult[] => [
      { cameraId: "cam_far", distanceM: 500 },
      { cameraId: "cam_near", distanceM: 25 },
    ];
    const hits = inspectCorridorService(
      [cam("cam_far", -6.195, 106.805), cam("cam_near", -6.195, 106.806)],
      path,
      1000,
      fakeInspect,
    );

    expect(hits).toHaveLength(2);
    expect(hits[0].camera.id).toBe("cam_near");
    expect(hits[0].distanceToPath).toBe(25);
    expect(hits[1].camera.id).toBe("cam_far");
    expect(hits[1].distanceToPath).toBe(500);
    expect(typeof hits[0].distanceAlongPath).toBe("number");
  });

  it("dedups a camera across segments keeping the minimum distance", () => {
    let seg = 0;
    const fakeInspect = (): CorridorResult[] => {
      seg += 1;
      return seg === 1
        ? [{ cameraId: "cam_x", distanceM: 100 }]
        : [{ cameraId: "cam_x", distanceM: 5 }];
    };
    const hits = inspectCorridorService([cam("cam_x")], path, 1000, fakeInspect);
    expect(hits).toHaveLength(1);
    expect(hits[0].distanceToPath).toBe(5);
  });

  it("reports distanceAlongPath as cumulative length to the nearest segment", () => {
    let seg = 0;
    const fakeInspect = (): CorridorResult[] => {
      seg += 1;
      return seg === 2 ? [{ cameraId: "cam_seg1", distanceM: 30 }] : [];
    };
    const hits = inspectCorridorService(
      [cam("cam_seg1")],
      path,
      1000,
      fakeInspect,
    );
    // Only appears on segment index 1, so along-path offset is length of seg 0.
    const expected = haversineM([path[0].lat, path[0].lng], [path[1].lat, path[1].lng]);
    expect(hits).toHaveLength(1);
    expect(hits[0].distanceAlongPath).toBeCloseTo(expected, 3);
  });

  it("skips cameras returned by inspect that are not in the provided list", () => {
    const fakeInspect = (): CorridorResult[] => [
      { cameraId: "not_in_list", distanceM: 10 },
      { cameraId: "in_list", distanceM: 20 },
    ];
    const hits = inspectCorridorService([cam("in_list")], path, 1000, fakeInspect);
    expect(hits).toHaveLength(1);
    expect(hits[0].camera.id).toBe("in_list");
  });
});
