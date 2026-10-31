/**
 * Minimal player event surface for the Web Shell.
 *
 * This is the integration seam the Health-Inspector lane hooks into later.
 * Health-Inspector should subscribe to the emitter (or the onEvent prop of
 * <Player>) and build its state machine from these events. Do not build the
 * health machine here.
 */

export type PlayerStatus = "idle" | "loading" | "ready" | "error" | "stopped";

export interface PlayerEvent {
  status: PlayerStatus;
  cameraId: string;
  /** Optional structured detail (e.g. fatal HLS error payload). */
  detail?: unknown;
}

export type PlayerEventListener = (event: PlayerEvent) => void;

export interface PlayerEventEmitter {
  /** Subscribe. Returns an unsubscribe function. */
  subscribe(listener: PlayerEventListener): () => void;
  emit(event: PlayerEvent): void;
  clear(): void;
}

export function createPlayerEmitter(): PlayerEventEmitter {
  const listeners = new Set<PlayerEventListener>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(event) {
      // Copy to guard against mutation during iteration.
      for (const listener of [...listeners]) listener(event);
    },
    clear() {
      listeners.clear();
    },
  };
}
