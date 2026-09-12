/**
 * Core shared types for the private watch-party application.
 * Framework-agnostic and strictly typed.
 */

export interface RoomInvitePayload {
  roomId: string;
  allowedEmails: string[];
  expiresAt: number; // Milliseconds Unix timestamp
  maxParticipants: 10;
  createdAt?: number;
}

export type SyncEventType = 'play' | 'pause' | 'seek' | 'heartbeat' | 'ratechange';

export interface SyncEvent {
  type: SyncEventType;
  currentTime: number; // Video playback time in seconds
  timestamp: number; // Wall-clock timestamp in ms when event was dispatched
  senderId: string; // Unique identity of sender
  playbackRate?: number; // Current playback rate (default 1.0)
  mediaId?: string; // Optional identifier/hash of the media
  sequence?: number; // Monotonically increasing sequence number
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface CatchUpRequest {
  type: 'catchup_req';
  senderId: string;
  timestamp: number;
}

export interface CatchUpResponse {
  type: 'catchup_res';
  senderId: string;
  events: (SyncEvent | ChatMessage)[];
  latestPlaybackState?: {
    currentTime: number;
    paused: boolean;
    playbackRate: number;
    timestamp: number;
  };
}

export type DataChannelPayload =
  | { topic: 'sync'; event: SyncEvent }
  | { topic: 'chat'; message: ChatMessage }
  | { topic: 'catchup_req'; request: CatchUpRequest }
  | { topic: 'catchup_res'; response: CatchUpResponse };

export interface LocalFileMeta {
  name: string;
  size: number;
  duration: number;
  digest?: string; // First 2MB + duration SHA-256 digest
}

export type LayoutMode = 'spotlight' | 'grid' | 'sidebar';
