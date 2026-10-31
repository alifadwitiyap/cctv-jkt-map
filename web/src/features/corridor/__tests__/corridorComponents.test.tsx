import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CorridorLayer } from "../CorridorLayer";
import { CorridorResults } from "../CorridorResults";
import { GuidedTour } from "../GuidedTour";
import { CorridorEditor } from "../CorridorEditor";
import { pathBounds, svgToLatLng } from "../corridorGeometry";
import type { CorridorHit, CorridorPoint, CorridorPreset } from "../types";
import type { ParsedCamera } from "../../../lib/wasm/contracts";

const cam = (id: string): ParsedCamera => ({
  id,
  name: id,
  streamUrl: `https://x/${id}/embed.html`,
  streamPath: id,
  lat: -6.2,
  lng: 106.8,
  confidence: "medium",
});

const hit = (id: string, dist: number, along = 0): CorridorHit => ({
  camera: cam(id),
  distanceToPath: dist,
  distanceAlongPath: along,
});

const PATH: CorridorPoint[] = [
  { lat: -6.2, lng: 106.8 },
  { lat: -6.19, lng: 106.82 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CorridorLayer", () => {
  it("renders a polyline for a two-point path", () => {
    render(<CorridorLayer path={PATH} />);
    const line = screen.getByTestId("corridor-line");
    expect(line).toBeInTheDocument();
    const points = line.getAttribute("points")!;
    expect(points.trim().split(/\s+/)).toHaveLength(2);
  });

  it("renders a buffer hint when radiusM is provided", () => {
    const { rerender } = render(<CorridorLayer path={PATH} />);
    expect(screen.queryByTestId("corridor-buffer")).not.toBeInTheDocument();
    rerender(<CorridorLayer path={PATH} radiusM={200} />);
    expect(screen.getByTestId("corridor-buffer")).toBeInTheDocument();
  });
});

describe("CorridorResults", () => {
  const hits = [hit("a", 50), hit("b", 10), hit("c", 30)];

  it("renders hits in the given order", () => {
    render(<CorridorResults hits={hits} />);
    const items = screen.getAllByTestId(/hit-/);
    expect(items.map((el) => el.getAttribute("data-testid"))).toEqual([
      "hit-a",
      "hit-b",
      "hit-c",
    ]);
  });

  it("calls onSelectCamera with the camera id on click", () => {
    const onSelectCamera = vi.fn();
    render(<CorridorResults hits={hits} onSelectCamera={onSelectCamera} />);
    fireEvent.click(screen.getByTestId("hit-b"));
    expect(onSelectCamera).toHaveBeenCalledWith("b");
  });

  it("flags the selected hit", () => {
    render(<CorridorResults hits={hits} selectedCameraId="c" />);
    expect(screen.getByTestId("hit-c")).toHaveAttribute("aria-current", "true");
  });
});

describe("GuidedTour", () => {
  const hits = [hit("a", 50), hit("b", 10), hit("c", 30)];

  it("selects the first hit on mount", () => {
    const onSelectCamera = vi.fn();
    render(<GuidedTour hits={hits} onSelectCamera={onSelectCamera} />);
    expect(onSelectCamera).toHaveBeenCalledWith("a");
  });

  it("advances selection with next", () => {
    const onSelectCamera = vi.fn();
    render(<GuidedTour hits={hits} onSelectCamera={onSelectCamera} />);
    fireEvent.click(screen.getByTestId("tour-next"));
    expect(onSelectCamera).toHaveBeenCalledWith("b");
  });

  it("does not step before the first hit", () => {
    const onSelectCamera = vi.fn();
    render(<GuidedTour hits={hits} onSelectCamera={onSelectCamera} />);
    fireEvent.click(screen.getByTestId("tour-prev"));
    expect(onSelectCamera).toHaveBeenCalledTimes(1);
    expect(onSelectCamera).toHaveBeenCalledWith("a");
  });

  it("clamps next at the last hit", () => {
    const onSelectCamera = vi.fn();
    render(<GuidedTour hits={hits} initialIndex={2} onSelectCamera={onSelectCamera} />);
    fireEvent.click(screen.getByTestId("tour-next"));
    const calls = onSelectCamera.mock.calls.map((c) => c[0]);
    expect(calls[calls.length - 1]).toBe("c");
  });

  it("a failing camera selection does not block next", () => {
    const onSelectCamera = vi.fn((id: string) => {
      if (id === "b") throw new Error("camera b exploded");
    });
    render(<GuidedTour hits={hits} onSelectCamera={onSelectCamera} />);
    fireEvent.click(screen.getByTestId("tour-next")); // b throws, caught
    fireEvent.click(screen.getByTestId("tour-next")); // c
    const calls = onSelectCamera.mock.calls.map((c) => c[0]);
    expect(calls[calls.length - 1]).toBe("c");
  });

  it("respects prefers-reduced-motion styling", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    const { container } = render(
      <GuidedTour hits={hits} onSelectCamera={vi.fn()} />,
    );
    expect(container.firstChild).toHaveClass("guided-tour--reduced-motion");
  });

  it("enables motion styling when reduced-motion is off", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    const { container } = render(
      <GuidedTour hits={hits} onSelectCamera={vi.fn()} />,
    );
    expect(container.firstChild).toHaveClass("guided-tour");
    expect(container.firstChild).not.toHaveClass("guided-tour--reduced-motion");
  });
});

describe("CorridorEditor", () => {
  const presets: CorridorPreset[] = [
    { id: "p1", name: "Preset 1", path: PATH },
  ];

  const renderEditor = (overrides: Record<string, unknown> = {}) => {
    const props = {
      path: PATH,
      canFinish: true,
      finished: false,
      presets,
      onAddPoint: vi.fn(),
      onUndo: vi.fn(),
      onClear: vi.fn(),
      onFinish: vi.fn(),
      onSelectPreset: vi.fn(),
      width: 800,
      height: 600,
      ...overrides,
    };
    return { props, ...render(<CorridorEditor {...props} />) };
  };

  it("fires onAddPoint when the surface is clicked", () => {
    const { props } = renderEditor();
    const surface = screen.getByTestId("corridor-editor-surface");
    Object.defineProperty(surface, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    });
    fireEvent.click(surface, { clientX: 200, clientY: 300 });
    const bounds = pathBounds(PATH);
    const expected = svgToLatLng(200, 300, bounds, 800, 600);
    expect(props.onAddPoint).toHaveBeenCalledTimes(1);
    expect(props.onAddPoint.mock.calls[0][0].lat).toBeCloseTo(expected.lat, 6);
    expect(props.onAddPoint.mock.calls[0][0].lng).toBeCloseTo(expected.lng, 6);
  });

  it("does not add a point when a vertex marker is clicked", () => {
    const { props } = renderEditor();
    const marker = screen.getByTestId("corridor-vertex-0");
    fireEvent.click(marker);
    expect(props.onAddPoint).not.toHaveBeenCalled();
  });

  it("fires onUndo, onClear and onFinish from controls", () => {
    const { props } = renderEditor();
    fireEvent.click(screen.getByTestId("corridor-undo"));
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("corridor-clear"));
    expect(props.onClear).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("corridor-finish"));
    expect(props.onFinish).toHaveBeenCalledTimes(1);
  });

  it("disables finish when canFinish is false", () => {
    renderEditor({ canFinish: false });
    expect(screen.getByTestId("corridor-finish")).toBeDisabled();
  });

  it("preset select fires onSelectPreset", () => {
    const { props } = renderEditor();
    fireEvent.change(screen.getByTestId("corridor-preset"), {
      target: { value: "p1" },
    });
    expect(props.onSelectPreset).toHaveBeenCalledWith("p1");
  });
});
