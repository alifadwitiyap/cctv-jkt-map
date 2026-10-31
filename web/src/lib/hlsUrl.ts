/**
 * Flussonic cameras.json ships the *embed page* URL (`.../embed.html`), not
 * the HLS manifest. Both the shell player and the Health-Inspector session must
 * load the real manifest, so they share this derivation.
 */
export function toHlsManifest(streamUrl: string): string {
  if (!streamUrl) return streamUrl;
  if (/\.m3u8($|\?)/.test(streamUrl)) return streamUrl;
  const path = streamUrl.replace(/\/+$/, "");
  const slash = path.lastIndexOf("/");
  if (slash < 0) return streamUrl;
  return `${path.slice(0, slash)}/index.m3u8`;
}
