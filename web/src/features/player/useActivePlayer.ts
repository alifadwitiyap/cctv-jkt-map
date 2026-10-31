import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { initialHealthState } from "./healthMachine";
import { PlayerSession, type HlsLike, type VideoLike } from "./PlayerSession";
import type { HealthState } from "./types";

export interface ActiveCamera {
  id: string;
  streamUrl: string;
}

export interface ActivePlayerOptions {
  /** Overridable for tests. Defaults to creating a real <video> element. */
  createVideo?: () => VideoLike;
  /** Overridable for tests. Defaults to a real Hls instance. */
  hlsFactory?: () => HlsLike;
  nowFn?: () => number;
}

export interface ActivePlayerResult {
  state: HealthState;
  play: () => void;
  retry: () => void;
}

/**
 * Links the app's active camera to a PlayerSession. A new session is created
 * per camera id; switching cameras destroys the stale session so its late
 * events can never affect the active one. Unmount destroys the session.
 */
export function useActivePlayer(
  camera: ActiveCamera | null,
  opts: ActivePlayerOptions = {},
): ActivePlayerResult {
  const [state, setState] = useState<HealthState>(() => initialHealthState());
  const sessionRef = useRef<PlayerSession | null>(null);

  useEffect(() => {
    if (!camera) return;

    const createVideo = opts.createVideo ?? (() => document.createElement("video") as VideoLike);
    const hlsFactory = opts.hlsFactory ?? (() => new Hls() as unknown as HlsLike);

    const session = new PlayerSession({
      streamUrl: camera.streamUrl,
      video: createVideo(),
      hls: hlsFactory(),
      onUpdate: setState,
      nowFn: opts.nowFn,
    });
    sessionRef.current = session;
    session.start();

    return () => {
      session.destroy();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [camera?.id, camera?.streamUrl, opts.createVideo, opts.hlsFactory, opts.nowFn]);

  const play = () => {
    sessionRef.current?.play();
  };

  const retry = () => {
    sessionRef.current?.requestRetry();
  };

  return { state, play, retry };
}
