import { afterEach, describe, expect, it, vi } from "vitest";
import Hls, { ErrorDetails } from "hls.js";
import { PlayerSession, type HlsLike, type VideoLike } from "./PlayerSession";
import type { HealthState } from "./types";

afterEach(() => {
  vi.useRealTimers();
});

class FakeHls implements HlsLike {
  events: Record<string, Array<(...a: unknown[]) => void>> = {};
  loadSource = vi.fn();
  attachMedia = vi.fn();
  startLoad = vi.fn();
  recoverMediaError = vi.fn();
  destroy = vi.fn();

  on(event: string, cb: (...a: unknown[]) => void): void {
    (this.events[event] ??= []).push(cb);
  }
  off(event: string, cb: (...a: unknown[]) => void): void {
    this.events[event] = (this.events[event] ?? []).filter((x) => x !== cb);
  }
  emit(event: string, ...args: unknown[]): void {
    for (const cb of this.events[event] ?? []) cb(...args);
  }
}

class FakeVideo implements VideoLike {
  listeners: Record<string, Array<() => void>> = {};
  paused = true;
  private rvfc: Array<(now: number, metadata: unknown) => void> = [];

  addEventListener(type: string, cb: () => void): void {
    (this.listeners[type] ??= []).push(cb);
  }
  removeEventListener(type: string, cb: () => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((x) => x !== cb);
  }
  requestVideoFrameCallback(cb: (now: number, metadata: unknown) => void): number {
    this.rvfc.push(cb);
    return this.rvfc.length;
  }
  cancelVideoFrameCallback(): void {
    this.rvfc = [];
  }
  emit(type: string): void {
    for (const cb of this.listeners[type] ?? []) cb();
  }
  fireRvfc(): void {
    const cbs = this.rvfc;
    this.rvfc = [];
    for (const cb of cbs) cb(0, {});
  }
}

function makeSession(onUpdate: (s: HealthState) => void, nowFn = () => 1000) {
  const hls = new FakeHls();
  const video = new FakeVideo();
  const session = new PlayerSession({ streamUrl: "https://example/x.m3u8", video, hls, onUpdate, nowFn });
  return { hls, video, session };
}

const fatalManifest = { type: "networkError", details: ErrorDetails.MANIFEST_LOAD_TIMEOUT, fatal: true };
const fatalMedia = { type: "mediaError", details: ErrorDetails.BUFFER_APPEND_ERROR, fatal: true };

describe("PlayerSession", () => {
  it("start() pushes an initial loading snapshot", () => {
    const updates: HealthState[] = [];
    const { session } = makeSession((s) => updates.push(s));
    session.start();
    expect(updates.at(-1)?.status).toBe("loading");
  });

  it("records playing-estimate TTFF from the video playing event", () => {
    const updates: HealthState[] = [];
    const { session, video } = makeSession((s) => updates.push(s));
    session.start();
    video.emit("playing");
    const last = updates.at(-1)!;
    expect(last.status).toBe("playing");
    expect(last.firstFrameMethod).toBe("playing-estimate");
    expect(last.firstFrameMs).toBe(1000);
  });

  it("records rvfc TTFF exactly once", () => {
    const updates: HealthState[] = [];
    const { session, video } = makeSession((s) => updates.push(s));
    session.start();
    video.fireRvfc();
    video.fireRvfc();
    const last = updates.at(-1)!;
    expect(last.firstFrameMethod).toBe("rvfc");
    expect(last.firstFrameMs).toBe(0);
  });

  it("counts buffering episodes from waiting/playing cycling", () => {
    const updates: HealthState[] = [];
    const { session, video } = makeSession((s) => updates.push(s));
    session.start();
    video.fireRvfc(); // now playing
    video.emit("waiting");
    video.emit("waiting");
    video.emit("playing");
    video.emit("waiting");
    expect(updates.at(-1)?.bufferingCount).toBe(2);
  });

  it("non-fatal errors surface as transient status without retry", () => {
    const updates: HealthState[] = [];
    const { session, hls } = makeSession((s) => updates.push(s));
    session.start();
    hls.emit(Hls.Events.ERROR, {}, { type: "networkError", details: ErrorDetails.MANIFEST_LOAD_ERROR, fatal: false });
    const last = updates.at(-1)!;
    expect(last.status).toBe("manifest-error");
    expect(last.terminal).toBe(false);
    expect(hls.startLoad).not.toHaveBeenCalled();
  });

  it("fatal manifest error schedules a network retry and restarts after backoff", () => {
    vi.useFakeTimers();
    const updates: HealthState[] = [];
    const { session, hls } = makeSession((s) => updates.push(s));
    session.start();
    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    // transient error surfaced while retrying
    expect(updates.at(-1)?.terminal).toBe(false);
    vi.advanceTimersByTime(999);
    expect(hls.startLoad).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hls.startLoad).toHaveBeenCalledTimes(1);
    expect(updates.at(-1)?.status).toBe("loading");
    expect(updates.at(-1)?.retryAttempt).toBe(1);
  });

  it("fatal media error uses a single media recovery", () => {
    vi.useFakeTimers();
    const { session, hls } = makeSession(() => {});
    session.start();
    hls.emit(Hls.Events.ERROR, {}, fatalMedia);
    vi.advanceTimersByTime(1000);
    expect(hls.recoverMediaError).toHaveBeenCalledTimes(1);
    expect(hls.startLoad).not.toHaveBeenCalled();
  });

  it("goes terminal after network retry budget is exhausted", () => {
    vi.useFakeTimers();
    const updates: HealthState[] = [];
    const { session, hls } = makeSession((s) => updates.push(s));
    session.start();

    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    vi.advanceTimersByTime(1000);
    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    vi.advanceTimersByTime(2000);
    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    vi.advanceTimersByTime(4000);
    expect(hls.startLoad).toHaveBeenCalledTimes(3);

    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    const last = updates.at(-1)!;
    expect(last.terminal).toBe(true);
    expect(last.status).toBe("manifest-error");
  });

  it("keeps a single active recovery timer (second fatal error cancels first)", () => {
    vi.useFakeTimers();
    const { session, hls } = makeSession(() => {});
    session.start();
    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    vi.advanceTimersByTime(2000);
    expect(hls.startLoad).toHaveBeenCalledTimes(1);
  });

  it("ignores stale events after destroy()", () => {
    const updates: HealthState[] = [];
    const { session, hls, video } = makeSession((s) => updates.push(s));
    session.start();
    const before = updates.length;
    session.destroy();
    video.emit("playing");
    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    video.emit("waiting");
    expect(updates.length).toBe(before);
  });

  it("destroy() cancels pending timers and destroys hls", () => {
    vi.useFakeTimers();
    const { session, hls } = makeSession(() => {});
    session.start();
    hls.emit(Hls.Events.ERROR, {}, fatalManifest);
    session.destroy();
    expect(hls.destroy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(hls.startLoad).not.toHaveBeenCalled();
  });
});
