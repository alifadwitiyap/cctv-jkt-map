import { describe, expect, it } from "vitest";
import { FEATURED_IDS, featuredCameras } from "../featured";

describe("featured cameras", () => {
  it("resolves exactly the curated ids to catalog records", () => {
    const featured = featuredCameras();
    expect(featured).toHaveLength(FEATURED_IDS.length);
    expect(featured.map((c) => c.id)).toEqual(FEATURED_IDS);
  });

  it("preserves curation order across ids", () => {
    const ids = featuredCameras().map((c) => c.id);
    expect(ids[0]).toBe("cam_004"); // Thamrin (busiest) first
    expect(ids[1]).toBe("cam_015"); // Gerbang Pemuda
  });

  it("every featured camera has coordinates", () => {
    for (const c of featuredCameras()) {
      expect(typeof c.lat).toBe("number");
      expect(typeof c.lng).toBe("number");
    }
  });
});
