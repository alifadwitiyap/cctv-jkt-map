# CCTV Jakarta Map

Interactive map of public CCTV cameras in DKI Jakarta.

- **web/** — React + Vite + TypeScript frontend (renders cameras from `data/cameras.json`, consumes WASM core for parsing/clustering/corridor math).
- **rust/** — Cargo workspace (WASM core `cctv-core` + CLI `cctv-cli`).
- **data/cameras.json** — camera catalog joined from live API snapshots and coordinates.
- **scripts/build_cameras.py** — regenerate `data/cameras.json` from the public catalog API + `C:/tmp/cctv_coords.json`.

## Build

```bash
cd web && npm install && npm run build
cd rust && cargo build
```
