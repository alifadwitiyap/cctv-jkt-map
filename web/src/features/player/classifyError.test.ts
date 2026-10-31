import { describe, expect, it } from "vitest";
import { ErrorDetails, ErrorTypes } from "hls.js";
import { classifyError } from "./classifyError";

describe("classifyError", () => {
  it("manifest load timeout -> manifest-error / manifest-load", () => {
    const c = classifyError({
      type: ErrorTypes.NETWORK_ERROR,
      details: ErrorDetails.MANIFEST_LOAD_TIMEOUT,
      fatal: true,
      reason: "timed out",
    });
    expect(c.status).toBe("manifest-error");
    expect(c.stage).toBe("manifest-load");
    expect(c.code).toBe(ErrorDetails.MANIFEST_LOAD_TIMEOUT);
    expect(c.message).toBe("timed out");
    expect(c.fatal).toBe(true);
  });

  it("manifest load error -> manifest-error / manifest-load", () => {
    const c = classifyError({ type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.MANIFEST_LOAD_ERROR });
    expect(c.status).toBe("manifest-error");
    expect(c.stage).toBe("manifest-load");
  });

  it("manifest parsing error -> manifest-error / manifest-parse", () => {
    const c = classifyError({ type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.MANIFEST_PARSING_ERROR });
    expect(c.status).toBe("manifest-error");
    expect(c.stage).toBe("manifest-parse");
  });

  it("level load error is treated as manifest-load, not decode", () => {
    const c = classifyError({ type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.LEVEL_LOAD_TIMEOUT });
    expect(c.status).toBe("manifest-error");
    expect(c.stage).toBe("manifest-load");
  });

  it("media-type error without a known detail -> decode-error / media-decode", () => {
    const c = classifyError({ type: ErrorTypes.MEDIA_ERROR });
    expect(c.status).toBe("decode-error");
    expect(c.stage).toBe("media-decode");
  });

  it("buffer append error -> decode-error / media-decode", () => {
    const c = classifyError({ type: ErrorTypes.MEDIA_ERROR, details: ErrorDetails.BUFFER_APPEND_ERROR });
    expect(c.status).toBe("decode-error");
    expect(c.stage).toBe("media-decode");
  });

  it("fragment timeout -> disconnected / fragment-timeout (network, not decode)", () => {
    const c = classifyError({ type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.FRAG_LOAD_TIMEOUT });
    expect(c.status).toBe("disconnected");
    expect(c.stage).toBe("fragment-timeout");
  });

  it("fragment load error -> disconnected / fragment-timeout", () => {
    const c = classifyError({ type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.FRAG_LOAD_ERROR });
    expect(c.status).toBe("disconnected");
    expect(c.stage).toBe("fragment-timeout");
  });

  it("unknown fatal -> disconnected / unknown-fatal", () => {
    const c = classifyError({ type: ErrorTypes.OTHER_ERROR, details: ErrorDetails.INTERNAL_EXCEPTION, fatal: true });
    expect(c.status).toBe("disconnected");
    expect(c.stage).toBe("unknown-fatal");
    expect(c.fatal).toBe(true);
  });

  it("falls back to a safe message when reason is absent", () => {
    const c = classifyError({ type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.MANIFEST_LOAD_ERROR });
    expect(c.message.length).toBeGreaterThan(0);
  });
});
