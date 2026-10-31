import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CameraSearchPanel } from "./CameraSearchPanel";
import type { CameraMarker } from "../lib/cameraMarkers";
import type { ParsedCamera } from "../lib/wasm/contracts";

const cam = (id: string, name: string): ParsedCamera => ({
  id,
  name,
  streamUrl: `https://x/${id}/embed.html`,
  streamPath: id,
  lat: -6.2,
  lng: 106.8,
  confidence: "medium",
});

const cameras = [
  cam("cam_001", "Taman Literasi-C01"),
  cam("cam_002", "Simpang Jl. Panglima Polim-C01"),
  cam("cam_003", "Jl. Sultan Agung-C03"),
  cam("cam_004", "JKP DISHUB JL. MH. THAMRIN C01"),
];

describe("CameraSearchPanel", () => {
  it("lists all cameras when query is empty", () => {
    render(<CameraSearchPanel cameras={cameras} selectedId={null} onSelect={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("filters by location name (case-insensitive, partial)", () => {
    render(<CameraSearchPanel cameras={cameras} selectedId={null} onSelect={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "sultan" } });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain("Jl. Sultan Agung-C03");
  });

  it("filters by camera id", () => {
    render(<CameraSearchPanel cameras={cameras} selectedId={null} onSelect={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "cam_002" } });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain("Simpang Jl. Panglima Polim-C01");
  });

  it("shows empty state when nothing matches", () => {
    render(<CameraSearchPanel cameras={cameras} selectedId={null} onSelect={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zebra" } });
    expect(screen.getByText(/Tidak ada kamera/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("calls onSelect with the camera marker on click", () => {
    const onSelect = vi.fn();
    render(<CameraSearchPanel cameras={cameras} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Taman Literasi-C01/));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const m = onSelect.mock.calls[0][0] as CameraMarker;
    expect(m.id).toBe("cam_001");
    expect(m.name).toBe("Taman Literasi-C01");
  });

  it("marks the selected camera row", () => {
    render(<CameraSearchPanel cameras={cameras} selectedId="cam_003" onSelect={() => {}} />);
    const sel = document.querySelector('[data-testid="camera-search-list"] [data-selected]');
    expect(sel).toBeTruthy();
    expect(sel!.textContent).toContain("Jl. Sultan Agung-C03");
  });
});
