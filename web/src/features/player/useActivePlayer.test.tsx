import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useActivePlayer, type ActiveCamera } from "./useActivePlayer";
import type { HlsLike, VideoLike } from "./PlayerSession";

class FakeHls implements HlsLike {
  events: Record<string, Array<(...a: unknown[]) => void>> = {};
  loadSource = vi.fn();
  attachMedia = vi.fn();
  startLoad = vi.fn();
  destroy = vi.fn();
  on(event: string, cb: (...a: unknown[]) => void): void {
    (this.events[event] ??= []).push(cb);
  }
}

class FakeVideo implements VideoLike {
  listeners: Record<string, Array<() => void>> = {};
  paused = true;
  play = vi.fn();
  addEventListener(type: string, cb: () => void): void {
    (this.listeners[type] ??= []).push(cb);
  }
  removeEventListener(type: string, cb: () => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((x) => x !== cb);
  }
}

function makeOpts() {
  const videos: FakeVideo[] = [];
  const hlsList: FakeHls[] = [];
  const opts = {
    createVideo: () => {
      const v = new FakeVideo();
      videos.push(v);
      return v;
    },
    hlsFactory: () => {
      const h = new FakeHls();
      hlsList.push(h);
      return h;
    },
  };
  return { opts, videos, hlsList };
}

const camA: ActiveCamera = { id: "a", streamUrl: "https://e/a.m3u8" };
const camB: ActiveCamera = { id: "b", streamUrl: "https://e/b.m3u8" };

describe("useActivePlayer", () => {
  it("creates a session and exposes an initial loading state", () => {
    const { opts, videos, hlsList } = makeOpts();
    const { result } = renderHook(({ cam }: { cam: ActiveCamera | null }) => useActivePlayer(cam, opts), {
      initialProps: { cam: camA },
    });
    expect(videos.length).toBe(1);
    expect(hlsList.length).toBe(1);
    expect(result.current.state.status).toBe("loading");
  });

  it("switching camera destroys the old session and starts a new one", () => {
    const { opts, hlsList } = makeOpts();
    const { result, rerender } = renderHook(({ cam }: { cam: ActiveCamera | null }) => useActivePlayer(cam, opts), {
      initialProps: { cam: camA },
    });
    rerender({ cam: camB });
    expect(hlsList.length).toBe(2);
    expect(hlsList[0].destroy).toHaveBeenCalledTimes(1);
    expect(hlsList[1].destroy).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("loading");
  });

  it("unmount destroys the active session", () => {
    const { opts, hlsList } = makeOpts();
    const { unmount } = renderHook(({ cam }: { cam: ActiveCamera | null }) => useActivePlayer(cam, opts), {
      initialProps: { cam: camA },
    });
    unmount();
    expect(hlsList[0].destroy).toHaveBeenCalledTimes(1);
  });

  it("play() resumes the underlying video", () => {
    const { opts, videos } = makeOpts();
    const { result } = renderHook(({ cam }: { cam: ActiveCamera | null }) => useActivePlayer(cam, opts), {
      initialProps: { cam: camA },
    });
    act(() => {
      result.current.play();
    });
    expect(videos[0].play).toHaveBeenCalledTimes(1);
  });

  it("handles camera removal by leaving the session cleared", () => {
    const { opts, hlsList } = makeOpts();
    const { result, rerender } = renderHook(({ cam }: { cam: ActiveCamera | null }) => useActivePlayer(cam, opts), {
      initialProps: { cam: camA as ActiveCamera | null },
    });
    rerender({ cam: null });
    expect(hlsList[0].destroy).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe("loading");
  });
});
