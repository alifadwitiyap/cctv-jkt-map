import { describe, expect, it } from "vitest";
import { healthMachine, initialHealthState } from "./healthMachine";
import type { HealthAction } from "./healthMachine";
import type { ClassifiedError } from "./types";

const now = 1000;

function classified(status: ClassifiedError["status"], stage: ClassifiedError["stage"], fatal = true): ClassifiedError {
  return { status, stage, code: "TEST", message: "test", fatal };
}

function step(state: ReturnType<typeof initialHealthState>, actions: HealthAction[]) {
  return actions.reduce(healthMachine, state);
}

describe("healthMachine: startup", () => {
  it("starts in loading, non-terminal, no metrics", () => {
    const s = initialHealthState();
    expect(s.status).toBe("loading");
    expect(s.terminal).toBe(false);
    expect(s.firstFrameMs).toBeNull();
    expect(s.bufferingCount).toBe(0);
    expect(s.retryAttempt).toBe(0);
  });

  it("manifest parsed stays in loading", () => {
    const s = step(initialHealthState(), [{ type: "manifest-parsed" }]);
    expect(s.status).toBe("loading");
  });

  it("first frame via rvfc transitions to playing and records TTFF", () => {
    const s = step(initialHealthState(), [
      { type: "manifest-parsed" },
      { type: "first-frame", method: "rvfc", now },
    ]);
    expect(s.status).toBe("playing");
    expect(s.firstFrameMs).toBe(now);
    expect(s.firstFrameMethod).toBe("rvfc");
  });

  it("tracks TTFF only once", () => {
    const s = step(initialHealthState(), [
      { type: "first-frame", method: "rvfc", now },
      { type: "first-frame", method: "rvfc", now: 9999 },
    ]);
    expect(s.firstFrameMs).toBe(now);
    expect(s.firstFrameMethod).toBe("rvfc");
  });

  it("playing event before any first-frame records a playing-estimate", () => {
    const s = step(initialHealthState(), [{ type: "playing", now }]);
    expect(s.status).toBe("playing");
    expect(s.firstFrameMs).toBe(now);
    expect(s.firstFrameMethod).toBe("playing-estimate");
  });

  it("playing event after first-frame does not overwrite TTFF method", () => {
    const s = step(initialHealthState(), [
      { type: "first-frame", method: "rvfc", now },
      { type: "playing", now: 9999 },
    ]);
    expect(s.firstFrameMs).toBe(now);
    expect(s.firstFrameMethod).toBe("rvfc");
  });
});

describe("healthMachine: buffering episodes", () => {
  function playingState() {
    return step(initialHealthState(), [{ type: "first-frame", method: "rvfc", now }]);
  }

  it("waiting/waiting/playing/waiting counts 2 buffering episodes", () => {
    const s = step(playingState(), [
      { type: "waiting" },
      { type: "waiting" },
      { type: "playing", now },
      { type: "waiting" },
    ]);
    expect(s.status).toBe("buffering");
    expect(s.bufferingCount).toBe(2);
  });

  it("single waiting counts one episode", () => {
    const s = step(playingState(), [{ type: "waiting" }]);
    expect(s.bufferingCount).toBe(1);
  });

  it("waiting before first frame is startup and never counts", () => {
    const s = step(initialHealthState(), [{ type: "waiting" }]);
    expect(s.bufferingCount).toBe(0);
    expect(s.firstFrameMs).toBeNull();
  });

  it("waiting after pause does not count", () => {
    const s = step(playingState(), [
      { type: "pause" },
      { type: "waiting" },
    ]);
    expect(s.bufferingCount).toBe(0);
  });

  it("buffering episode ends on playing, so next waiting counts again", () => {
    const s = step(playingState(), [
      { type: "waiting" },
      { type: "playing", now },
      { type: "waiting" },
    ]);
    expect(s.bufferingCount).toBe(2);
  });
});

describe("healthMachine: errors and retry", () => {
  it("transient manifest error sets status but stays non-terminal", () => {
    const s = step(initialHealthState(), [
      { type: "error", error: classified("manifest-error", "manifest-load"), terminal: false },
    ]);
    expect(s.status).toBe("manifest-error");
    expect(s.terminal).toBe(false);
    expect(s.error?.stage).toBe("manifest-load");
  });

  it("terminal error sets terminal dimension true", () => {
    const s = step(initialHealthState(), [
      { type: "error", error: classified("decode-error", "media-decode"), terminal: true },
    ]);
    expect(s.status).toBe("decode-error");
    expect(s.terminal).toBe(true);
  });

  it("retry returns to loading and increments retryAttempt", () => {
    const s = step(initialHealthState(), [
      { type: "error", error: classified("manifest-error", "manifest-load"), terminal: false },
      { type: "retry" },
    ]);
    expect(s.status).toBe("loading");
    expect(s.terminal).toBe(false);
    expect(s.retryAttempt).toBe(1);
  });

  it("disconnect maps to disconnected status", () => {
    const s = step(initialHealthState(), [{ type: "disconnect" }]);
    expect(s.status).toBe("disconnected");
  });
});
