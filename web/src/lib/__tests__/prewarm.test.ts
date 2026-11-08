import { describe, expect, it, vi, beforeEach } from "vitest";
import { prewarmHosts } from "../prewarm";

const ORIGIN = "https://dki-jkt.balitower.co.id:7028";

beforeEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("prewarmHosts", () => {
  it("warms the camera hosts so cards don't cold-start TLS (~48s each)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    prewarmHosts();

    // Await microtasks so the fetch calls dispatch.
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchMock).toHaveBeenCalled();
    const urls = fetchMock.mock.calls.flat() as string[];
    expect(urls.some((u) => u.startsWith(ORIGIN))).toBe(true);
  });

  it("runs only once per tab session (one batch, not repeated)", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    prewarmHosts();
    const firstBatch = fetchMock.mock.calls.length;
    prewarmHosts();
    prewarmHosts();

    // Second/third calls are no-ops (sessionStorage guard) — fetchCount unchanged.
    expect(fetchMock.mock.calls.length).toBe(firstBatch);
    expect(firstBatch).toBeGreaterThan(0);
  });
});
