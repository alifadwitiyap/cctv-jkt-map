import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StreamHealthPanel } from "./StreamHealthPanel";
import type { HealthState } from "./types";

function state(over: Partial<HealthState> = {}): HealthState {
  return {
    status: "loading",
    terminal: false,
    firstFrameMs: null,
    firstFrameMethod: null,
    bufferingCount: 0,
    retryAttempt: 0,
    needsUserPlay: false,
    error: null,
    ...over,
  };
}

function renderPanel(s: HealthState, onRetry = vi.fn()) {
  return render(
    <StreamHealthPanel state={s} cameraName="Taman" fallbackUrl="https://jakcctv.jakarta.go.id/publik" onRetry={onRetry} />,
  );
}

describe("StreamHealthPanel", () => {
  it("shows the loading status", () => {
    renderPanel(state());
    expect(screen.getByTestId("health-status")).toHaveTextContent("loading");
  });

  it("shows TTFF when a first frame was captured", () => {
    renderPanel(state({ status: "playing", firstFrameMs: 850, firstFrameMethod: "rvfc" }));
    expect(screen.getByTestId("ttff")).toHaveTextContent("850ms");
  });

  it("shows a dash when no first frame yet", () => {
    renderPanel(state());
    expect(screen.getByTestId("ttff")).toHaveTextContent("—");
  });

  it("shows buffering and retry counts", () => {
    renderPanel(state({ status: "buffering", bufferingCount: 2, retryAttempt: 1 }));
    expect(screen.getByTestId("buffering-count")).toHaveTextContent("2");
    expect(screen.getByTestId("retry-count")).toHaveTextContent("1");
  });

  it("shows error detail and a Retry button when non-terminal", async () => {
    const onRetry = vi.fn();
    renderPanel(
      state({
        status: "manifest-error",
        error: { status: "manifest-error", stage: "manifest-load", code: "manifestLoadError", message: "timed out", fatal: true },
      }),
      onRetry,
    );
    expect(screen.getByTestId("error-detail")).toHaveTextContent("timed out");
    const btn = screen.getByTestId("retry-button");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("hides the Retry button and shows the fallback link when terminal", () => {
    renderPanel(
      state({
        status: "decode-error",
        terminal: true,
        error: { status: "decode-error", stage: "media-decode", code: "bufferAppendError", message: "decode failed", fatal: true },
      }),
    );
    expect(screen.queryByTestId("retry-button")).not.toBeInTheDocument();
    const link = screen.getByTestId("fallback-link");
    expect(link).toHaveAttribute("href", "https://jakcctv.jakarta.go.id/publik");
  });

  it("does not show a fallback link while non-terminal", () => {
    renderPanel(state({ status: "manifest-error" }));
    expect(screen.queryByTestId("fallback-link")).not.toBeInTheDocument();
  });
});
