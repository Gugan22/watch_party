export interface ActiveRoom {
  roomId: string;
  roomName?: string;
  hostEmail: string;
  hostName: string;
  createdAt: number;
  expiresAt: number;
  kickedIdentities: Set<string>;
}

declare global {
  var __watchPartyRoomStore: Map<string, ActiveRoom> | undefined;
  var __watchPartyDeployId: string | undefined;
}

const currentDeployId = process.env.NEXT_PUBLIC_DEPLOY_ID || 'local';

// Reset room store if deploy ID changed to start 100% fresh on every deployment
if (global.__watchPartyDeployId !== currentDeployId) {
  global.__watchPartyRoomStore = new Map<string, ActiveRoom>();
  global.__watchPartyDeployId = currentDeployId;
}

const roomStore: Map<string, ActiveRoom> = global.__watchPartyRoomStore ?? new Map<string, ActiveRoom>();
global.__watchPartyRoomStore = roomStore;

export function clearAllRooms(): number {
  const count = roomStore.size;
  roomStore.clear();
  return count;
}

export function getActiveRoomCount(): number {
  return roomStore.size;
}

export function getActiveRoomList(): string[] {
  return Array.from(roomStore.keys());
}

export function getRoom(roomId: string): ActiveRoom | undefined {
  const cleanId = roomId.trim().toLowerCase();
  const room = roomStore.get(cleanId);
  if (!room) return undefined;

  // Auto clean up expired rooms
  if (Date.now() > room.expiresAt * 1000) {
    roomStore.delete(cleanId);
    return undefined;
  }
  return room;
}

export function createRoom(
  roomId: string,
  roomName: string,
  hostEmail: string,
  hostName: string,
  expiryHours: number
): { success: boolean; error?: string; room?: ActiveRoom } {
  const cleanId = roomId.trim().toLowerCase();
  
  // Enforce unique room id
  const existing = getRoom(cleanId);
  if (existing) {
    return { success: false, error: `Room ID "${cleanId}" is already active. Please choose a unique room ID.` };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + expiryHours * 3600;

  const room: ActiveRoom = {
    roomId: cleanId,
    roomName: roomName.trim() || 'Watch Party',
    hostEmail: hostEmail.toLowerCase(),
    hostName,
    createdAt: now,
    expiresAt,
    kickedIdentities: new Set<string>(),
  };

  roomStore.set(cleanId, room);
  return { success: true, room };
}

export function kickParticipant(roomId: string, participantId: string): boolean {
  const room = getRoom(roomId);
  if (!room) return false;
  room.kickedIdentities.add(participantId);
  return true;
}

export function isParticipantKicked(roomId: string, participantId: string): boolean {
  const room = getRoom(roomId);
  if (!room) return false;
  return room.kickedIdentities.has(participantId);
}
