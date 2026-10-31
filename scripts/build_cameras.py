#!/usr/bin/env python3
"""Build data/cameras.json.

- Fetch catalog pages 1..7 from the public API (live).
- Parse each card: iframe src -> streamName, title div -> site name.
- Join with coordinates from C:/tmp/cctv_coords.json.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

API_URL = "https://jakcctv.jakarta.go.id/publik/data?q=&page={page}"
UA = "Mozilla/5.0"
IFRAME_RE = re.compile(
    r'<iframe[^>]*src="https://[^"]+/([^/]+)/embed\.html(?:\?[^"]*)?"'
)
TITLE_RE = re.compile(r'<div class="title">([^<]+)</div>')
COORDS_PATH = Path("C:/tmp/cctv_coords.json")
OUT_PATH = Path("D:/project/cctv-jkt-map/data/cameras.json")
PAGES = 7


def fetch_page(page: int):
    req = urllib.request.Request(API_URL.format(page=page), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def load_coords():
    with open(COORDS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    sites = {}
    for loc in data["locations"]:
        sites[loc["site"]] = {
            "lat": loc["lat"],
            "lng": loc["lng"],
            "confidence": loc["confidence"],
        }
    return sites


def main():
    coords = load_coords()
    cameras = []
    dropped = 0

    for page in range(1, PAGES + 1):
        try:
            body = fetch_page(page)
        except Exception as e:  # noqa: BLE001
            print(f"[warn] page {page} fetch failed: {e}", file=sys.stderr)
            continue
        cards_html = body.get("cards", "")
        # Each card is a <div class="card"> block; within a card there may be
        # multiple iframes (cameras) sharing one title.
        for chunk in cards_html.split('<div class="card">'):
            if "<iframe" not in chunk:
                continue
            titles = TITLE_RE.findall(chunk)
            streams = IFRAME_RE.findall(chunk)
            if not titles:
                print(f"[warn] page {page}: card has no title", file=sys.stderr)
                continue
            site = titles[0].strip()
            if site not in coords:
                print(f"[warn] drop {site}: not in coords", file=sys.stderr)
                dropped += 1
                continue
            c = coords[site]
            for stream_name in streams:
                cameras.append(
                    {
                        "streamPath": stream_name,
                        "name": site,
                        "lat": c["lat"],
                        "lng": c["lng"],
                        "confidence": c["confidence"],
                    }
                )

    # deterministic order by streamPath, then assign stable ids
    cameras.sort(key=lambda c: c["streamPath"])
    for idx, c in enumerate(cameras, 1):
        c["streamUrl"] = f"https://dki-jkt.balitower.co.id:7028/{c['streamPath']}/embed.html"
        c["id"] = f"cam_{idx:03d}"

    cameras.sort(key=lambda c: c["id"])

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cameras, f, ensure_ascii=False, indent=2)

    print(f"wrote {len(cameras)} cameras -> {OUT_PATH} (dropped {dropped})")


if __name__ == "__main__":
    main()
