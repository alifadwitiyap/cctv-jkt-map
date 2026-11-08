import { useMemo, useState } from "react";
import type { ParsedCamera } from "../lib/wasm/contracts";
import { previewUrl } from "../lib/hlsUrl";
import CardPlayer from "./CardPlayer";

interface OverviewProps {
  /** Every unique place in the catalog, featured first — page 0 = highlights. */
  places: ParsedCamera[];
  onWatch: (camera: ParsedCamera) => void;
  onShowOnMap: (camera: ParsedCamera) => void;
}

const PAGE_SIZE = 6;

/** Live muted thumbnail; falls back to preview image, then placeholder icon. */
function CardThumb({ camera }: { camera: ParsedCamera }) {
  const src = useMemo(() => previewUrl(camera.streamUrl), [camera.streamUrl]);
  const [imgFailed, setImgFailed] = useState(false);

  const placeholder = (
    <div className="overview-card__thumb">
      <span className="overview-card__cam-icon" aria-hidden="true" />
      <span className="overview-card__status">Pratinjau tidak tersedia</span>
    </div>
  );

  const previewImg = src && !imgFailed ? (
    <div className="overview-card__thumb">
      <img
        className="overview-card__preview"
        src={src}
        alt=""
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
      <span className="overview-card__status">Cuplikan langsung</span>
    </div>
  ) : (
    placeholder
  );

  return <CardPlayer streamUrl={camera.streamUrl} fallback={previewImg} />;
}

export default function Overview({ places, onWatch, onShowOnMap }: OverviewProps) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(places.length / PAGE_SIZE));
  const visible = useMemo(
    () => places.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [places, page],
  );

  return (
    <section className="overview">
      <div className="overview__head">
        <h2 className="overview__title">Sorotan</h2>
        <p className="overview__subtitle">
          Monitor langsung lokasi paling ramai — ketuk video untuk layar penuh.
        </p>
      </div>

      <div className="overview__rail" role="list" aria-label="Lokasi kamera">
        {visible.map((cam) => (
          <article
            key={cam.id}
            className="overview-card"
            role="listitem"
            onClick={() => onWatch(cam)}
          >
            <CardThumb camera={cam} />
            <div className="overview-card__label">
              <span className="overview-card__name" title={cam.name}>
                {cam.name}
              </span>
              {cam.district && (
                <span className="overview-card__district">{cam.district}</span>
              )}
              <button
                type="button"
                className="overview-card__map-btn"
                aria-label={`Lihat ${cam.name} di peta`}
                title="Lihat di peta"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowOnMap(cam);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="overview__nav">
        <button
          type="button"
          className="overview__nav-btn"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          aria-label="Sebelumnya"
        >
          ‹
        </button>
        <span className="overview__page">
          {page + 1} / {pages}
        </span>
        <button
          type="button"
          className="overview__nav-btn"
          onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          disabled={page >= pages - 1}
          aria-label="Berikutnya"
        >
          ›
        </button>
      </div>
    </section>
  );
}
