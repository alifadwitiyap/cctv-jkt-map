import { ErrorDetails, ErrorTypes } from "hls.js";
import type { ClassifiedError, ErrorStage } from "./types";

/** Minimal structural view of an hls.js error event data payload. */
export interface HlsErrorLike {
  type?: string;
  details?: string;
  fatal?: boolean;
  reason?: string;
  err?: unknown;
}

const {
  MANIFEST_LOAD_ERROR,
  MANIFEST_LOAD_TIMEOUT,
  MANIFEST_PARSING_ERROR,
  LEVEL_LOAD_ERROR,
  LEVEL_LOAD_TIMEOUT,
  LEVEL_PARSING_ERROR,
  FRAG_LOAD_ERROR,
  FRAG_LOAD_TIMEOUT,
  FRAG_PARSING_ERROR,
  BUFFER_APPEND_ERROR,
  BUFFER_APPENDING_ERROR,
  BUFFER_STALLED_ERROR,
  BUFFER_NUDGE_ON_STALL,
  BUFFER_FULL_ERROR,
  BUFFER_ADD_CODEC_ERROR,
} = ErrorDetails;

const MANIFEST_LOAD_DETAILS = new Set<string>([
  MANIFEST_LOAD_ERROR,
  MANIFEST_LOAD_TIMEOUT,
  LEVEL_LOAD_ERROR,
  LEVEL_LOAD_TIMEOUT,
]);

const MANIFEST_PARSE_DETAILS = new Set<string>([
  MANIFEST_PARSING_ERROR,
  LEVEL_PARSING_ERROR,
]);

const FRAGMENT_TIMEOUT_DETAILS = new Set<string>([
  FRAG_LOAD_ERROR,
  FRAG_LOAD_TIMEOUT,
]);

const MEDIA_DECODE_DETAILS = new Set<string>([
  FRAG_PARSING_ERROR,
  BUFFER_APPEND_ERROR,
  BUFFER_APPENDING_ERROR,
  BUFFER_STALLED_ERROR,
  BUFFER_NUDGE_ON_STALL,
  BUFFER_FULL_ERROR,
  BUFFER_ADD_CODEC_ERROR,
]);

function matchByDetails(details: string): { status: ClassifiedError["status"]; stage: ErrorStage } | null {
  if (MANIFEST_LOAD_DETAILS.has(details)) return { status: "manifest-error", stage: "manifest-load" };
  if (MANIFEST_PARSE_DETAILS.has(details)) return { status: "manifest-error", stage: "manifest-parse" };
  if (FRAGMENT_TIMEOUT_DETAILS.has(details)) return { status: "disconnected", stage: "fragment-timeout" };
  if (MEDIA_DECODE_DETAILS.has(details)) return { status: "decode-error", stage: "media-decode" };
  return null;
}

/**
 * Map an hls.js error event to health status + stage + code + message.
 * Deliberately keeps network (manifest/fragment load) separate from decode
 * (media/buffer) failures so we never mislabel one as the other.
 */
export function classifyError(err: HlsErrorLike): ClassifiedError {
  const details = err.details ?? "unknown";
  let cls = matchByDetails(details);
  // A media-type error with an unrecognised detail (e.g. an unmapped buffer
  // code) is still a decode/media failure, not a network one.
  if (!cls && err.type === ErrorTypes.MEDIA_ERROR) {
    cls = { status: "decode-error", stage: "media-decode" };
  }
  if (!cls) cls = { status: "disconnected", stage: "unknown-fatal" };

  const message =
    err.reason && err.reason.length > 0
      ? err.reason
      : `HLS ${cls.stage} failure (${details})`;

  return {
    status: cls.status,
    stage: cls.stage,
    code: details,
    message,
    fatal: err.fatal === true,
  };
}
