import { toHlsManifest } from "./hlsUrl";
import { CAMERAS } from "./cameraMarkers";

const PREWARM_KEY = "cctv-prewarmed";

/**
 * The camera host's cold TLS handshake is pathological (~48s in Chromium)
 * while a warm connection answers in ~10ms. Warm one connection per host up
 * front so the six live cards share a pooled connection instead of firing six
 * cold handshakes at once (which made cards take ~a minute to start).
 *
 * Runs once per session; deliberately fire-and-forget (no abort, no error).
 */
export function prewarmHosts(): void {
  if (sessionStorage.getItem(PREWARM_KEY)) return;
  sessionStorage.setItem(PREWARM_KEY, "1");

  const hosts = new Set<string>();
  for (const cam of CAMERAS) {
    hosts.add(new URL(toHlsManifest(cam.streamUrl)).origin);
  }

  for (const origin of hosts) {
    // Warm the TLS connection with a real manifest request so the connection
    // is pooled and framed by the time the cards mount.
    const cam = CAMERAS.find((c) => c.streamUrl.startsWith(origin)) ?? CAMERAS[0];
    void fetch(toHlsManifest(cam.streamUrl)).catch(() => {});
  }
}
