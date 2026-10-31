import { describe, expect, it, vi } from "vitest";
import {
  corridorReducer,
  initialCorridorState,
} from "../corridorReducer";
import { CURATED_CORRIDORS } from "../curatedCorridors";
import type { CorridorPoint } from "../types";

const p = (lat: number, lng: number): CorridorPoint => ({ lat, lng });

describe("corridorReducer", () => {
  it("adds a point and resets finished", () => {
    const s = corridorReducer(initialCorridorState, {
      type: "addPoint",
      point: p(-6.1, 106.8),
    });
    expect(s.points).toHaveLength(1);
    expect(s.points[0]).toEqual({ lat: -6.1, lng: 106.8 });
    expect(s.finished).toBe(false);
  });

  it("undo removes the last point", () => {
    let s = corridorReducer(initialCorridorState, { type: "addPoint", point: p(1, 1) });
    s = corridorReducer(s, { type: "addPoint", point: p(2, 2) });
    s = corridorReducer(s, { type: "undo" });
    expect(s.points).toEqual([p(1, 1)]);
  });

  it("undo on empty state is a no-op", () => {
    const s = corridorReducer(initialCorridorState, { type: "undo" });
    expect(s).toBe(initialCorridorState);
  });

  it("clear resets points, preset and finished", () => {
    let s = corridorReducer(initialCorridorState, {
      type: "selectPreset",
      preset: CURATED_CORRIDORS[0],
    });
    expect(s.finished).toBe(true);
    s = corridorReducer(s, { type: "clear" });
    expect(s.points).toEqual([]);
    expect(s.presetId).toBeNull();
    expect(s.finished).toBe(false);
  });

  describe("finish validation", () => {
    it("does not finish with zero points", () => {
      const s = corridorReducer(initialCorridorState, { type: "finish" });
      expect(s.finished).toBe(false);
    });

    it("does not finish with a single point", () => {
      let s = corridorReducer(initialCorridorState, {
        type: "addPoint",
        point: p(1, 1),
      });
      s = corridorReducer(s, { type: "finish" });
      expect(s.finished).toBe(false);
    });

    it("does not finish when all points are identical", () => {
      let s = corridorReducer(initialCorridorState, { type: "addPoint", point: p(1, 1) });
      s = corridorReducer(s, { type: "addPoint", point: p(1, 1) });
      s = corridorReducer(s, { type: "finish" });
      expect(s.finished).toBe(false);
    });

    it("finishes with two distinct points", () => {
      let s = corridorReducer(initialCorridorState, { type: "addPoint", point: p(1, 1) });
      s = corridorReducer(s, { type: "addPoint", point: p(2, 2) });
      s = corridorReducer(s, { type: "finish" });
      expect(s.finished).toBe(true);
    });

    it("adding a point after finish unfinishes", () => {
      let s = corridorReducer(initialCorridorState, { type: "addPoint", point: p(1, 1) });
      s = corridorReducer(s, { type: "addPoint", point: p(2, 2) });
      s = corridorReducer(s, { type: "finish" });
      s = corridorReducer(s, { type: "addPoint", point: p(3, 3) });
      expect(s.finished).toBe(false);
    });
  });

  describe("preset selection", () => {
    it("loads preset points, id and marks finished", () => {
      const preset = CURATED_CORRIDORS[0];
      const s = corridorReducer(initialCorridorState, { type: "selectPreset", preset });
      expect(s.points).toEqual(preset.path);
      expect(s.presetId).toBe(preset.id);
      expect(s.finished).toBe(true);
    });
  });

  describe("privacy", () => {
    it("writes no storage and fires no analytics during draw/preset/undo", () => {
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      let s = corridorReducer(initialCorridorState, { type: "addPoint", point: p(1, 1) });
      s = corridorReducer(s, { type: "addPoint", point: p(2, 2) });
      s = corridorReducer(s, { type: "selectPreset", preset: CURATED_CORRIDORS[0] });
      s = corridorReducer(s, { type: "undo" });

      expect(setItem).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();

      setItem.mockRestore();
      fetchSpy.mockRestore();
    });
  });
});
