import type { ParsedCamera } from "../../lib/wasm/contracts";
import { CAMERAS } from "../../lib/cameraMarkers";

/**
 * The six "Sorotan" (featured) cameras — curated busiest/most-signature
 * Jakarta locations, ordered by how iconic/ramai each spot is.
 * No usage data exists yet, so this is a manual, high-confidence curation.
 */
export const FEATURED_IDS = [
  "cam_004", // Jl. MH. Thamrin — arteri utama CBD
  "cam_015", // Gerbang Pemuda / Gelora Bung Karno — Senayan
  "cam_031", // Pasar Tanah Abang — pasar tersibuk
  "cam_006", // Simpang Sultan Agung — simpang ramai Jaksel
  "cam_013", // Jl. Gatot Subroto — arteri utama
  "cam_029", // Jl. S. Parman — arteri utama
];

/** Resolve the featured list to full camera records, preserving curation order. */
export function featuredCameras(): ParsedCamera[] {
  return FEATURED_IDS.map(
    (id) => CAMERAS.find((c) => c.id === id),
  ).filter((c): c is ParsedCamera => Boolean(c));
}

/**
 * All unique places in the catalog, one camera per location (deduped by name).
 * Featured (busiest) places come first, then the rest in catalog order — so the
 * overview's next/prev browsing can move beyond the six highlights.
 */
export function overviewCameras(): ParsedCamera[] {
  const seen = new Set<string>();
  const out: ParsedCamera[] = [];
  const push = (c: ParsedCamera) => {
    if (!seen.has(c.name)) {
      seen.add(c.name);
      out.push(c);
    }
  };
  for (const id of FEATURED_IDS) {
    const c = CAMERAS.find((x) => x.id === id);
    if (c) push(c);
  }
  for (const c of CAMERAS) push(c);
  return out;
}
