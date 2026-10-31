import type { ClassifiedError, HealthState } from "./types";

export type HealthAction =
  | { type: "start" }
  | { type: "reset" }
  | { type: "manifest-parsed" }
  | { type: "first-frame"; method: "rvfc" | "playing-estimate"; now?: number }
  | { type: "playing"; now?: number }
  | { type: "waiting" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "error"; error: ClassifiedError; terminal: boolean }
  | { type: "retry" }
  | { type: "disconnect" }
  | { type: "needs-user-play" };

interface InternalState extends HealthState {
  /** True while the user has paused the stream (buffer events ignored). */
  _paused: boolean;
  /** True while a buffering episode is already being counted. */
  _bufferingEpisode: boolean;
}

export function initialHealthState(): HealthState {
  return {
    status: "loading",
    terminal: false,
    firstFrameMs: null,
    firstFrameMethod: null,
    bufferingCount: 0,
    retryAttempt: 0,
    needsUserPlay: false,
    error: null,
  };
}

function fresh(): InternalState {
  return { ...initialHealthState(), _paused: false, _bufferingEpisode: false };
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Pure reducer for player health. Terminal is a separate dimension from
 * status: an error status can be transient (retrying) or permanent (terminal).
 */
export function healthMachine(state: HealthState, action: HealthAction): HealthState {
  const s = state as InternalState;

  switch (action.type) {
    case "start":
    case "reset":
      return fresh();

    case "manifest-parsed":
      return { ...s };

    case "first-frame": {
      // Track TTFF only once.
      if (s.firstFrameMs !== null) return { ...s };
      const next: InternalState = {
        ...s,
        status: "playing",
        firstFrameMs: action.now ?? now(),
        firstFrameMethod: action.method,
        needsUserPlay: false,
        _bufferingEpisode: false,
      };
      return next;
    }

    case "playing": {
      const next: InternalState = {
        ...s,
        status: "playing",
        needsUserPlay: false,
        _paused: false,
        _bufferingEpisode: false,
      };
      if (next.firstFrameMs === null) {
        next.firstFrameMs = action.now ?? now();
        next.firstFrameMethod = "playing-estimate";
      }
      return next;
    }

    case "waiting": {
      if (s._paused || s._bufferingEpisode) return { ...s };
      const counted = s.firstFrameMs !== null && s.status === "playing";
      const next: InternalState = {
        ...s,
        status: "buffering",
        _bufferingEpisode: true,
        bufferingCount: counted ? s.bufferingCount + 1 : s.bufferingCount,
      };
      return next;
    }

    case "pause": {
      const next: InternalState = {
        ...s,
        _paused: true,
        _bufferingEpisode: false,
        status: s.status === "buffering" ? "playing" : s.status,
      };
      return next;
    }

    case "resume": {
      const next: InternalState = { ...s, _paused: false };
      return next;
    }

    case "error": {
      const next: InternalState = {
        ...s,
        status: action.error.status,
        terminal: action.terminal,
        error: action.error,
        _bufferingEpisode: false,
      };
      return next;
    }

    case "retry": {
      const next: InternalState = {
        ...s,
        status: "loading",
        terminal: false,
        retryAttempt: s.retryAttempt + 1,
        _bufferingEpisode: false,
      };
      return next;
    }

    case "disconnect": {
      const next: InternalState = {
        ...s,
        status: "disconnected",
        _bufferingEpisode: false,
      };
      return next;
    }

    case "needs-user-play": {
      const next: InternalState = { ...s, needsUserPlay: true, _paused: true };
      return next;
    }

    default:
      return { ...s };
  }
}
