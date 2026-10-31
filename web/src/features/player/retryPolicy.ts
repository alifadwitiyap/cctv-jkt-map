export type RetryKind = "network" | "media" | "fragment";

export const MAX_NETWORK_RETRIES = 3;
export const MAX_MEDIA_RETRIES = 1;
export const MAX_FRAGMENT_RETRIES = 5;

/**
 * Pure retry policy. Network traffic is bounded to 3 attempts with a 1/2/4s
 * backoff; media recovery is bounded to 1 attempt per session; fragment
 * timeouts (transient on live HLS) get a larger budget of 5 attempts so a
 * single stalled segment doesn't mark the whole stream dead. Once the budget
 * is exhausted the session is terminal (caller falls back to the official
 * link). This does NOT coordinate with hls.js's internal retry — the caller is
 * expected to disable or bypass hls internal retries while this policy owns the
 * recovery timeline.
 */
export function shouldRetry(kind: RetryKind, attempt: number): boolean {
  const max =
    kind === "fragment"
      ? MAX_FRAGMENT_RETRIES
      : kind === "network"
        ? MAX_NETWORK_RETRIES
        : MAX_MEDIA_RETRIES;
  return attempt < max;
}

export function isTerminal(kind: RetryKind, attempt: number): boolean {
  return !shouldRetry(kind, attempt);
}

export function backoffMs(kind: RetryKind, attempt: number): number {
  if (kind === "fragment") return 800 * Math.pow(2, Math.min(attempt, 4));
  return kind === "network" ? 1000 * Math.pow(2, attempt) : 1000;
}

export interface RetryHooks {
  onRetry?: (kind: RetryKind, attempt: number) => void;
  onTerminal?: (kind: RetryKind) => void;
}

type TimerHandle = ReturnType<typeof setTimeout>;
type Scheduler = (fn: () => void, ms: number) => TimerHandle;

/**
 * Small controller for retry timers. Enforces exactly one active recovery queue
 * (scheduling a new retry cancels any pending one) and supports cancellation on
 * unmount. A transient success does NOT reset the attempt budget.
 */
export class RetryController {
  private attempts: Record<RetryKind, number> = {
    network: 0,
    media: 0,
    fragment: 0,
  };
  private timer: TimerHandle | null = null;

  constructor(
    private hooks: RetryHooks = {},
    private scheduler: Scheduler = (fn, ms) => setTimeout(fn, ms),
    private canceller: (h: TimerHandle) => void = (h) => clearTimeout(h),
  ) {
    this.attempts = { network: 0, media: 0, fragment: 0 };
  }

  schedule(kind: RetryKind): void {
    // ONE active recovery queue: drop any pending timer.
    if (this.timer !== null) {
      this.canceller(this.timer);
      this.timer = null;
    }

    const attempt = this.attempts[kind];
    if (isTerminal(kind, attempt)) {
      this.hooks.onTerminal?.(kind);
      return;
    }

    this.timer = this.scheduler(() => {
      this.timer = null;
      this.attempts[kind] += 1;
      this.hooks.onRetry?.(kind, this.attempts[kind]);
    }, backoffMs(kind, attempt));
  }

  cancel(): void {
    if (this.timer !== null) {
      this.canceller(this.timer);
      this.timer = null;
    }
  }

  /**
   * Records a success. Deliberately does NOT reset the attempt budget: a
   * transient success between failures must not grant extra retries.
   */
  markSuccess(_kind: RetryKind): void {
    // no-op by design — see contract
  }

  getAttempts(): Readonly<Record<RetryKind, number>> {
    return { ...this.attempts };
  }
}
