import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RetryController,
  backoffMs,
  isTerminal,
  shouldRetry,
  type RetryKind,
} from "./retryPolicy";

afterEach(() => {
  vi.useRealTimers();
});

describe("retryPolicy pure functions", () => {
  it("network retries: max 3, attempts 0-2 allowed, 3 terminal", () => {
    expect(shouldRetry("network", 0)).toBe(true);
    expect(shouldRetry("network", 1)).toBe(true);
    expect(shouldRetry("network", 2)).toBe(true);
    expect(shouldRetry("network", 3)).toBe(false);
    expect(isTerminal("network", 3)).toBe(true);
  });

  it("media recovery: at most 1 per session", () => {
    expect(shouldRetry("media", 0)).toBe(true);
    expect(shouldRetry("media", 1)).toBe(false);
    expect(isTerminal("media", 1)).toBe(true);
  });

  it("backoff is 1s/2s/4s for network retries", () => {
    expect(backoffMs("network", 0)).toBe(1000);
    expect(backoffMs("network", 1)).toBe(2000);
    expect(backoffMs("network", 2)).toBe(4000);
  });
});

describe("RetryController", () => {
  it("fires onRetry at each backoff step and terminal when budget exhausted", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const onTerminal = vi.fn();
    const c = new RetryController({ onRetry, onTerminal });

    c.schedule("network");
    vi.advanceTimersByTime(999);
    expect(onRetry).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onRetry).toHaveBeenLastCalledWith("network", 1);

    c.schedule("network");
    vi.advanceTimersByTime(2000);
    expect(onRetry).toHaveBeenLastCalledWith("network", 2);

    c.schedule("network");
    vi.advanceTimersByTime(4000);
    expect(onRetry).toHaveBeenLastCalledWith("network", 3);

    c.schedule("network");
    expect(onTerminal).toHaveBeenCalledWith("network");
  });

  it("keeps a single active recovery queue (new schedule cancels pending)", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const c = new RetryController({ onRetry });

    c.schedule("network");
    c.schedule("network");
    vi.advanceTimersByTime(2000);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("cancel() prevents the pending retry from firing", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const c = new RetryController({ onRetry });

    c.schedule("network");
    c.cancel();
    vi.advanceTimersByTime(5000);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("media recovery: one attempt then terminal", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const onTerminal = vi.fn();
    const c = new RetryController({ onRetry, onTerminal });

    c.schedule("media");
    vi.advanceTimersByTime(1000);
    expect(onRetry).toHaveBeenLastCalledWith("media", 1);

    c.schedule("media");
    expect(onTerminal).toHaveBeenCalledWith("media");
  });

  it("transient success does not reset the retry budget", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const c = new RetryController({ onRetry });

    c.schedule("network");
    vi.advanceTimersByTime(1000);
    expect(onRetry).toHaveBeenLastCalledWith("network", 1);

    c.markSuccess("network");
    c.schedule("network");
    // If success reset the counter the next backoff would be 1000ms;
    // keep it the 2nd attempt's 2000ms window instead.
    vi.advanceTimersByTime(1000);
    expect(onRetry).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(onRetry).toHaveBeenLastCalledWith("network", 2);
  });

  it("cancels timers of any kind", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const c = new RetryController({ onRetry });
    c.schedule("media");
    c.schedule("network");
    c.cancel();
    vi.advanceTimersByTime(5000);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("does not schedule when kind is already terminal", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const onTerminal = vi.fn();
    const c = new RetryController({ onRetry, onTerminal });
    c.schedule("media");
    vi.advanceTimersByTime(1000);
    c.schedule("media");
    expect(onTerminal).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// type-only guard so RetryKind stays exported and used
export type _Guard = RetryKind;
