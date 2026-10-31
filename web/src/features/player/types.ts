/** Shared types for the Stream Health Inspector. */

export type HealthStatus =
  | "loading"
  | "playing"
  | "buffering"
  | "manifest-error"
  | "decode-error"
  | "disconnected";

export type ErrorStatus = Extract<HealthStatus, "manifest-error" | "decode-error" | "disconnected">;

/** Discriminates the failure stage so we never mislabel network vs decode. */
export type ErrorStage =
  | "manifest-load"
  | "manifest-parse"
  | "media-decode"
  | "fragment-timeout"
  | "unknown-fatal";

export interface ClassifiedError {
  status: ErrorStatus;
  stage: ErrorStage;
  /** Original hls.js ErrorDetails string. */
  code: string;
  message: string;
  /** True when hls.js reports the error as fatal. */
  fatal: boolean;
}

export type FirstFrameMethod = "rvfc" | "playing-estimate" | null;

export interface HealthMetrics {
  /** Time-to-first-frame in ms, captured exactly once. */
  firstFrameMs: number | null;
  firstFrameMethod: FirstFrameMethod;
  /** Number of buffering episodes (counted per episode, not per event). */
  bufferingCount: number;
  retryAttempt: number;
  needsUserPlay: boolean;
}

export interface HealthState extends HealthMetrics {
  status: HealthStatus;
  /**
   * Terminal is a SEPARATE dimension from status: an error can be transient
   * (retrying) or permanent (budget exhausted -> terminal fallback).
   */
  terminal: boolean;
  error: ClassifiedError | null;
}
