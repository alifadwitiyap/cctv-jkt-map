import Hls from "hls.js";
import { classifyError, type HlsErrorLike } from "./classifyError";
import { healthMachine, initialHealthState, type HealthAction } from "./healthMachine";
import { RetryController, type RetryKind } from "./retryPolicy";
import type { ClassifiedError, HealthState } from "./types";

/** Minimal structural view of the <video> element surface we drive. */
export interface VideoLike {
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
  requestVideoFrameCallback?(cb: (now: number, metadata: unknown) => void): number;
  cancelVideoFrameCallback?(handle: number): void;
  paused: boolean;
  play?: () => Promise<unknown> | void;
}

/** Minimal structural view of the hls.js instance surface we drive. */
export interface HlsLike {
  loadSource(url: string): void;
  attachMedia(video: unknown): void;
  startLoad?(): void;
  recoverMediaError?(): void;
  on(event: string, cb: (...args: unknown[]) => void): void;
  off?(event: string, cb: (...args: unknown[]) => void): void;
  destroy(): void;
}

export interface PlayerSessionInit {
  streamUrl: string;
  video: VideoLike;
  hls: HlsLike;
  onUpdate: (state: HealthState) => void;
  nowFn?: () => number;
}

/**
 * Owns one hls.js instance + video element + listeners + timers. Handles
 * camera switching by guaranteeing stale sessions (after destroy) never emit
 * updates, and coordinates bounded retries with hls.js.
 */
export class PlayerSession {
  private state: HealthState;
  private disposed = false;
  private retry: RetryController;
  private lastClassified: { cls: ClassifiedError; kind: RetryKind } | null = null;

  private readonly streamUrl: string;
  private readonly video: VideoLike;
  private readonly hls: HlsLike;
  private readonly onUpdate: (s: HealthState) => void;
  private readonly nowFn: () => number;

  constructor(init: PlayerSessionInit) {
    this.streamUrl = init.streamUrl;
    this.video = init.video;
    this.hls = init.hls;
    this.onUpdate = init.onUpdate;
    this.nowFn = init.nowFn ?? (() => performance.now());
    this.state = initialHealthState();
    this.retry = new RetryController({
      onRetry: (kind) => this.restart(kind),
      onTerminal: (kind) => this.terminal(kind),
    });
  }

  start(): void {
    if (this.disposed) return;
    this.hls.on(Hls.Events.MANIFEST_PARSED, this.onManifestParsed);
    this.hls.on(Hls.Events.ERROR, this.onHlsError);
    this.video.addEventListener("playing", this.onPlaying);
    this.video.addEventListener("waiting", this.onWaiting);
    this.video.addEventListener("pause", this.onPause);
    if (typeof this.video.requestVideoFrameCallback === "function") {
      this.video.requestVideoFrameCallback(this.onFirstFrame);
    }
    this.hls.loadSource(this.streamUrl);
    this.hls.attachMedia(this.video);
    this.onUpdate(this.state);
  }

  play(): void {
    this.dispatch({ type: "resume" });
    this.video.play?.();
  }

  /**
   * Manual retry from the panel button. Only meaningful while non-terminal;
   * scheduling past the budget routes to terminal (fallback), as expected.
   */
  requestRetry(): void {
    if (this.disposed) return;
    this.retry.schedule("network");
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.retry.cancel();
    this.hls.off?.(Hls.Events.MANIFEST_PARSED, this.onManifestParsed);
    this.hls.off?.(Hls.Events.ERROR, this.onHlsError);
    this.video.removeEventListener("playing", this.onPlaying);
    this.video.removeEventListener("waiting", this.onWaiting);
    this.video.removeEventListener("pause", this.onPause);
    this.hls.destroy();
    this.lastClassified = null;
  }

  private dispatch(action: HealthAction): void {
    if (this.disposed) return;
    this.state = healthMachine(this.state, action);
    this.onUpdate(this.state);
  }

  private onManifestParsed = (): void => {
    this.dispatch({ type: "manifest-parsed" });
    this.hls.startLoad?.();
  };

  private onPlaying = (): void => {
    this.dispatch({ type: "playing", now: this.nowFn() });
  };

  private onWaiting = (): void => {
    this.dispatch({ type: "waiting" });
  };

  private onPause = (): void => {
    this.dispatch({ type: "pause" });
  };

  private onFirstFrame = (now: number): void => {
    this.dispatch({ type: "first-frame", method: "rvfc", now });
  };

  private onHlsError = (_e: unknown, raw: unknown): void => {
    const err = raw as HlsErrorLike;
    const cls = classifyError(err);

    if (err.fatal !== true) {
      // Non-fatal: surface transient status; hls handles it internally.
      this.dispatch({ type: "error", error: cls, terminal: false });
      return;
    }

    const kind: RetryKind = cls.stage === "media-decode" ? "media" : "network";
    this.lastClassified = { cls, kind };
    // Surface the (transient) error while the retry timer is pending.
    this.dispatch({ type: "error", error: cls, terminal: false });
    this.retry.schedule(kind);
  };

  private restart = (kind: RetryKind): void => {
    this.dispatch({ type: "retry" });
    if (kind === "media") {
      this.hls.recoverMediaError?.();
    } else {
      this.hls.startLoad?.();
    }
  };

  private terminal = (_kind: RetryKind): void => {
    if (this.disposed) return;
    const cls =
      this.lastClassified?.cls ??
      ({
        status: "disconnected",
        stage: "unknown-fatal",
        code: "terminal",
        message: "Recovery budget exhausted",
        fatal: true,
      } satisfies ClassifiedError);
    this.dispatch({ type: "error", error: cls, terminal: true });
  };
}
