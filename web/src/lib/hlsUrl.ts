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

/**
 * Flussonic serves a live JPEG still at `.../preview.jpg` alongside the embed
 * page URL. Used as a real thumbnail on the overview cards. Some cameras have
 * no preview endpoint — the component falls back to the placeholder icon.
 */
export function previewUrl(streamUrl: string): string | null {
  if (!streamUrl) return null;
  const path = streamUrl.replace(/\/+$/, "");
  const slash = path.lastIndexOf("/");
  if (slash < 0) return null;
  return `${path.slice(0, slash)}/preview.jpg`;
}
