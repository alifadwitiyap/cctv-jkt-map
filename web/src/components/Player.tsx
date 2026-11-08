import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { createPlayerEmitter, type PlayerEvent, type PlayerStatus } from "../lib/playerEvents";
import { toHlsManifest } from "../lib/hlsUrl";

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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const handleManualPlay = () => {
    const video = videoRef.current;
    setAutoplayBlocked(false);
    if (video) {
      const p = video.play();
      p?.catch?.(() => setAutoplayBlocked(true));
    }
  };

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

    // Muted + autoplay allows programmatic playback in modern browsers;
    // the actual play() is requested once the manifest is parsed.
    video.autoplay = true;
    video.muted = true;

    const hls = new Hls();

    const onPlaying = () => {
      setAutoplayBlocked(false);
      emit({ status: "playing", cameraId });
    };
    video.addEventListener("playing", onPlaying);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      hls.startLoad();
      emit({ status: "ready", cameraId });
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Autoplay blocked -> surface a state the UI can turn into a
          // "press play" affordance instead of a blank/frozen player.
          setAutoplayBlocked(true);
          emit({ status: "error", cameraId, detail: { type: "autoplay-blocked", fatal: false } });
        });
      }
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        emit({ status: "error", cameraId, detail: { type: data.type, fatal: true } });
      }
    });

    hls.loadSource(toHlsManifest(streamUrl));
    hls.attachMedia(video);

    return () => {
      video.removeEventListener("playing", onPlaying);
      hls.destroy();
      emit({ status: "stopped", cameraId });
    };
  }, [cameraId, streamUrl]);

  const STATUS_LABEL: Record<PlayerStatus, string> = {
    idle: "Siap",
    loading: "Menghubungkan…",
    ready: "Menghubungkan…",
    playing: "Live",
    error: "Tidak tersedia",
    stopped: "Berhenti",
  };
  const statusLabel =
    status === "error" && autoplayBlocked
      ? "Ketuk untuk memutar"
      : STATUS_LABEL[status];
  const buffering = status === "loading" || status === "ready";

  return (
    <div className="player">
      <div className="player__meta">
        <span className={`player__status player__status--${status}`}>
          {statusLabel}
        </span>
      </div>
      <video ref={videoRef} className="player__video" controls playsInline muted />
      {buffering && (
        <div className="player__loading" role="status">
          Menghubungkan…
        </div>
      )}
      {status === "error" && autoplayBlocked && (
        <div className="player__autoplay-blocked" role="status">
          <p>Ketuk untuk memulai siaran</p>
          <button type="button" className="player__play-btn" onClick={handleManualPlay}>
            ▶ Putar
          </button>
        </div>
      )}
      {status === "error" && !autoplayBlocked && (
        <div className="player__error" role="alert">
          Siaran tidak tersedia untuk {cameraName}
        </div>
      )}
    </div>
  );
}
