import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { toHlsManifest } from "../lib/hlsUrl";

interface CardPlayerProps {
  streamUrl: string;
  fallback: React.ReactNode;
  /** Fired when the media box is tapped (after requesting fullscreen). */
  onOpen?: () => void;
}

/**
 * Live muted thumbnail on overview cards. Autoplay is allowed because the
 * video is muted (no sound, no gesture needed). If HLS fails, we fall back
 * to the static preview image / placeholder.
 */
export default function CardPlayer({ streamUrl, fallback, onOpen }: CardPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;

    video.autoplay = true;
    video.muted = true;

    const hls = new Hls();
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      hls.startLoad();
      const p = video.play();
      p?.catch?.(() => setFailed(true));
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) setFailed(true);
    });

    hls.loadSource(toHlsManifest(streamUrl));
    hls.attachMedia(video);

    return () => {
      hls.destroy();
    };
  }, [streamUrl, failed]);

  if (failed) return <>{fallback}</>;

  return (
    <div
      className="overview-card__thumb overview-card__thumb--live"
      onClick={(e) => {
        e.stopPropagation();
        const el = e.currentTarget;
        if (typeof el.requestFullscreen === "function") {
          el.requestFullscreen().catch(() => {});
        }
        onOpen?.();
      }}
    >
      <video ref={videoRef} className="overview-card__preview" muted playsInline autoPlay loop />
      <span className="overview-card__status">
        <span className="overview-card__dot" aria-hidden="true" />
        Live
      </span>
    </div>
  );
}
