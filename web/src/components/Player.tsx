import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { createPlayerEmitter, type PlayerEvent, type PlayerStatus } from "../lib/playerEvents";

export interface PlayerProps {
  cameraId: string;
  cameraName: string;
  streamUrl: string;
  onEvent?: (event: PlayerEvent) => void;
}

/**
 * HLS player shell.
 *
 * Emits a minimal PlayerEvent surface through `onEvent` (and through an
 * internal emitter). The Health-Inspector lane hooks this surface later to
 * build its health state machine — we intentionally do NOT build that here.
 */
export default function Player({ cameraId, cameraName, streamUrl, onEvent }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const emitterRef = useRef(createPlayerEmitter());
  const [status, setStatus] = useState<PlayerStatus>("idle");

  useEffect(() => {
    const emitter = emitterRef.current;
    if (!onEvent) return;
    return emitter.subscribe(onEvent);
  }, [onEvent]);

  useEffect(() => {
    const video = videoRef.current;
    const emitter = emitterRef.current;
    if (!video) return;

    const emit = (event: PlayerEvent) => {
      emitter.emit(event);
      setStatus(event.status);
    };

    emit({ status: "loading", cameraId });

    const hls = new Hls();

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      hls.startLoad();
      emit({ status: "ready", cameraId });
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        emit({ status: "error", cameraId, detail: { type: data.type, fatal: true } });
      }
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    return () => {
      hls.destroy();
      emit({ status: "stopped", cameraId });
    };
  }, [cameraId, streamUrl]);

  return (
    <div className="player">
      <div className="player__meta">
        <span className={`player__status player__status--${status}`}>{status}</span>
      </div>
      <video ref={videoRef} className="player__video" controls playsInline muted />
      {status === "loading" && (
        <div className="player__loading" role="status">
          Loading live stream…
        </div>
      )}
      {status === "error" && (
        <div className="player__error" role="alert">
          Stream unavailable for {cameraName}
        </div>
      )}
    </div>
  );
}
