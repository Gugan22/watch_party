/**
 * Sync Protocol: Pure TypeScript logic for playback drift correction,
 * event framing, cooldown protection, and in-memory catch-up buffering.
 * Zero DOM dependency — 100% unit-testable in isolation.
 */

import { SyncEvent, ChatMessage, SyncEventType } from './types.js';

export const DEFAULT_DRIFT_THRESHOLD_SECONDS = 1.5;
export const DEFAULT_SEEK_COOLDOWN_MS = 3000;
export const MAX_CATCH_UP_BUFFER_SIZE = 50;

/**
 * Calculates drift between local playback position and remote reported timestamp,
 * accounting for estimated network transit latency.
 *
 * @param localTime Current local video currentTime in seconds
 * @param remoteTime Remote video currentTime reported in seconds
 * @param transitLatencyMs Estimated one-way latency in milliseconds (defaults to 0)
 * @param playbackRate Current video playback rate (defaults to 1.0)
 * @param isPlaying Whether the video is actively playing
 * @returns Positive drift value in seconds
 */
export function calculateDrift(
  localTime: number,
  remoteTime: number,
  transitLatencyMs: number = 0,
  playbackRate: number = 1.0,
  isPlaying: boolean = true
): number {
  const latencySeconds = Math.max(0, transitLatencyMs) / 1000;
  const expectedRemoteTime = isPlaying
    ? remoteTime + latencySeconds * playbackRate
    : remoteTime;

  return Math.abs(localTime - expectedRemoteTime);
}

/**
 * Determines whether a client should perform an automatic seek to correct drift.
 * Enforces a strict cooldown period to eliminate ping-pong seek loops between peers.
 *
 * @param drift Calculated drift in seconds
 * @param thresholdSeconds Allowed threshold before triggering seek (default 1.5s)
 * @param lastCorrectionTime Epoch ms timestamp of the last executed seek
 * @param now Current epoch ms timestamp
 * @param cooldownMs Cooldown window in ms (default 3000ms)
 */
export function shouldCorrectDrift(
  drift: number,
  thresholdSeconds: number = DEFAULT_DRIFT_THRESHOLD_SECONDS,
  lastCorrectionTime: number = 0,
  now: number = Date.now(),
  cooldownMs: number = DEFAULT_SEEK_COOLDOWN_MS
): boolean {
  if (drift <= thresholdSeconds) {
    return false;
  }
  return now - lastCorrectionTime >= cooldownMs;
}

/**
 * Formats seconds into standard media timestamp string (e.g. "04:12" or "1:45:30").
 */
export function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Creates and frames a validated SyncEvent object.
 */
export function createSyncEvent(
  type: SyncEventType,
  currentTime: number,
  senderId: string,
  options?: {
    playbackRate?: number;
    mediaId?: string;
    sequence?: number;
    timestamp?: number;
  }
): SyncEvent {
  return {
    type,
    currentTime: Math.max(0, currentTime),
    timestamp: options?.timestamp ?? Date.now(),
    senderId,
    playbackRate: options?.playbackRate ?? 1.0,
    mediaId: options?.mediaId,
    sequence: options?.sequence,
  };
}

/**
 * Validates whether an arbitrary payload conforms to the SyncEvent schema.
 */
export function isValidSyncEvent(data: unknown): data is SyncEvent {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  const validTypes: SyncEventType[] = ['play', 'pause', 'seek', 'heartbeat', 'ratechange'];

  return (
    typeof obj.type === 'string' &&
    validTypes.includes(obj.type as SyncEventType) &&
    typeof obj.currentTime === 'number' &&
    Number.isFinite(obj.currentTime) &&
    typeof obj.timestamp === 'number' &&
    typeof obj.senderId === 'string' &&
    obj.senderId.length > 0
  );
}

/**
 * In-Memory Catch-Up Buffer:
 * Stores the last ~50 sync and chat events in a FIFO ring buffer held strictly
 * in memory by active room clients. Replaying this buffer allows reconnecting peers
 * to synchronize state without any disk or database persistence.
 */
export class CatchUpBufferManager {
  private buffer: (SyncEvent | ChatMessage)[] = [];
  private readonly capacity: number;

  constructor(capacity: number = MAX_CATCH_UP_BUFFER_SIZE) {
    this.capacity = capacity;
  }

  public add(event: SyncEvent | ChatMessage): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift(); // Evict oldest item
    }
    this.buffer.push(event);
  }

  public getAll(): (SyncEvent | ChatMessage)[] {
    return [...this.buffer];
  }

  public size(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
  }
}

/**
 * Blocked-Seek Detector:
 * Verifies that a programmatic seek actually shifted `currentTime`.
 * If a custom DRM player or protected streaming site ignores the seek command,
 * it detects the failure and flags a manual scrub recommendation instead of looping.
 */
export class BlockedSeekTracker {
  private targetSeekTime: number | null = null;
  private seekIssuedAt: number = 0;
  private consecutiveFailures: number = 0;
  private readonly maxFailuresBeforeAlert: number;
  private readonly verificationTimeoutMs: number;

  constructor(maxFailures: number = 2, timeoutMs: number = 1200) {
    this.maxFailuresBeforeAlert = maxFailures;
    this.verificationTimeoutMs = timeoutMs;
  }

  /**
   * Registers that a programmatic seek was commanded.
   */
  public registerSeek(targetTime: number, now: number = Date.now()): void {
    this.targetSeekTime = targetTime;
    this.seekIssuedAt = now;
  }

  /**
   * Verifies if the player's currentTime moved close to targetSeekTime.
   *
   * @param actualTime Current video currentTime
   * @param toleranceSeconds Allowed difference (default 0.5s)
   * @param now Current timestamp
   * @returns boolean indicating if seek succeeded
   */
  public verify(
    actualTime: number,
    toleranceSeconds: number = 0.5,
    now: number = Date.now()
  ): boolean {
    if (this.targetSeekTime === null) {
      return true;
    }

    // Still waiting for player to respond within timeout
    if (now - this.seekIssuedAt < this.verificationTimeoutMs) {
      const diff = Math.abs(actualTime - this.targetSeekTime);
      if (diff <= toleranceSeconds) {
        this.targetSeekTime = null;
        this.consecutiveFailures = 0;
        return true;
      }
      return true; // Pending
    }

    // Timeout elapsed and currentTime didn't move
    const diff = Math.abs(actualTime - this.targetSeekTime);
    if (diff > toleranceSeconds) {
      this.consecutiveFailures++;
      this.targetSeekTime = null;
      return false;
    }

    this.targetSeekTime = null;
    this.consecutiveFailures = 0;
    return true;
  }

  /**
   * Returns true if repeated programmatic seeks have failed,
   * indicating the player is rejecting programmatic seeking.
   */
  public isBlocked(): boolean {
    return this.consecutiveFailures >= this.maxFailuresBeforeAlert;
  }

  public reset(): void {
    this.targetSeekTime = null;
    this.seekIssuedAt = 0;
    this.consecutiveFailures = 0;
  }
}
