import { describe, expect, it } from "vitest";
import { initialPanelState, panelReducer } from "./panelReducer";

describe("panelReducer", () => {
  it("opens the panel and stores the active camera", () => {
    const next = panelReducer(initialPanelState, {
      type: "open",
      cameraId: "cam_001",
      name: "Taman Literasi-C01",
    });
    expect(next.open).toBe(true);
    expect(next.cameraId).toBe("cam_001");
    expect(next.selectedCameraName).toBe("Taman Literasi-C01");
  });

  it("closes the panel and clears the camera", () => {
    const open = panelReducer(initialPanelState, {
      type: "open",
      cameraId: "cam_001",
      name: "Taman Literasi-C01",
    });
    const next = panelReducer(open, { type: "close" });
    expect(next.open).toBe(false);
    expect(next.cameraId).toBeNull();
    expect(next.selectedCameraName).toBe("");
  });

  it("toggle closes the panel when the same camera is already open", () => {
    const open = panelReducer(initialPanelState, {
      type: "toggle",
      cameraId: "cam_005",
      name: "JKP DISHUB C01",
    });
    const next = panelReducer(open, {
      type: "toggle",
      cameraId: "cam_005",
      name: "JKP DISHUB C01",
    });
    expect(next.open).toBe(false);
  });

  it("toggle switches to another camera when one is already open", () => {
    const open = panelReducer(initialPanelState, {
      type: "toggle",
      cameraId: "cam_005",
      name: "JKP DISHUB C01",
    });
    const next = panelReducer(open, {
      type: "toggle",
      cameraId: "cam_006",
      name: "Simpang Jl. Sultan Agung-C01",
    });
    expect(next.open).toBe(true);
    expect(next.cameraId).toBe("cam_006");
  });
});
