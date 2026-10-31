import { describe, expect, it, vi } from "vitest";
import { createPlayerEmitter } from "./playerEvents";

describe("playerEvents", () => {
  it("delivers emitted events to subscribers", () => {
    const emitter = createPlayerEmitter();
    const listener = vi.fn();
    emitter.subscribe(listener);

    emitter.emit({ status: "ready", cameraId: "cam_001" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      status: "ready",
      cameraId: "cam_001",
    });
  });

  it("unsubscribe stops further delivery", () => {
    const emitter = createPlayerEmitter();
    const listener = vi.fn();
    const unsubscribe = emitter.subscribe(listener);
    unsubscribe();

    emitter.emit({ status: "error", cameraId: "cam_002" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("clear drops all listeners", () => {
    const emitter = createPlayerEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.subscribe(a);
    emitter.subscribe(b);
    emitter.clear();

    emitter.emit({ status: "stopped", cameraId: "cam_003" });
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});
