import type { CorridorPreset } from "./types";

/**
 * Curated preset corridors using real camera coordinates from data/cameras.json.
 * Each preset has a unique id and valid geometry (>= 2 distinct points).
 */
export const CURATED_CORRIDORS: CorridorPreset[] = [
  {
    id: "sudirman-thamrin",
    name: "Sudirman – Thamrin",
    path: [
      { lat: -6.2265, lng: 106.823 }, // JPO Gatot Subroto (cam_013)
      { lat: -6.195, lng: 106.8228 }, // Simpang MH. Thamrin C07 (cam_019)
      { lat: -6.1935, lng: 106.8229 }, // MH. Thamrin C01 (cam_004)
    ],
  },
  {
    id: "bendungan-hilir-senayan",
    name: "Bendungan Hilir – Senayan",
    path: [
      { lat: -6.2128, lng: 106.8009 }, // Gerbang Pemuda C02 (cam_015)
      { lat: -6.2265, lng: 106.823 }, // Gatot Subroto (cam_013)
    ],
  },
  {
    id: "tanah-abang-mangg arai",
    name: "Tanah Abang – Manggara",
    path: [
      { lat: -6.2458, lng: 106.798 }, // Simpang Panglima Polim (cam_002)
      { lat: -6.2059, lng: 106.8379 }, // Sultan Agung (cam_003)
    ],
  },
];

export function getPreset(id: string): CorridorPreset | undefined {
  return CURATED_CORRIDORS.find((preset) => preset.id === id);
}
