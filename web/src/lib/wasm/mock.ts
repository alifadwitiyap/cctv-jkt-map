import type {
  ClusterResult,
  CorridorRequest,
  CorridorResult,
  ParsedCamera,
} from "./contracts";

const IFRAME_RE =
  /src="https:\/\/dki-jkt\.balitower\.co\.id:7028\/([^/]+)\/embed\.html"/g;
const TITLE_RE = /<div class="title">([^<]+)<\/div>/g;

export function parseCatalog(html: string): ParsedCamera[] {
  const out: ParsedCamera[] = [];
  let m: RegExpExecArray | null;
  const streams: string[] = [];
  const titles: string[] = [];
  while ((m = IFRAME_RE.exec(html)) !== null) streams.push(m[1]);
  while ((m = TITLE_RE.exec(html)) !== null) titles.push(m[1].trim());
  const n = Math.min(streams.length, titles.length);
  for (let i = 0; i < n; i++) {
    out.push({
      id: `mock_${i}`,
      name: titles[i],
      streamUrl: `https://dki-jkt.balitower.co.id:7028/${streams[i]}/embed.html`,
      streamPath: streams[i],
      lat: 0,
      lng: 0,
      confidence: "medium",
    });
  }
  return out;
}

export function haversineM(
  a: [number, number],
  b: [number, number],
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function clusterMarkers(
  cameras: ParsedCamera[],
  zoom: number,
): ClusterResult[] {
  void zoom;
  if (cameras.length === 0) return [];
  if (cameras.length === 1) {
    const c = cameras[0];
    return [{ count: 1, lat: c.lat, lng: c.lng, cameras: [c.id] }];
  }
  const lat = cameras.reduce((s, c) => s + c.lat, 0) / cameras.length;
  const lng = cameras.reduce((s, c) => s + c.lng, 0) / cameras.length;
  return [{ count: cameras.length, lat, lng, cameras: cameras.map((c) => c.id) }];
}

export function inspectCorridor(input: CorridorRequest): CorridorResult[] {
  void input;
  return [];
}
