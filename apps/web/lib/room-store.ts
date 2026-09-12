// In-memory zero-persistence room registry
export interface ActiveRoom {
  roomId: string;
  hostEmail: string;
  hostName: string;
  createdAt: number;
  expiresAt: number;
  kickedIdentities: Set<string>;
}

declare global {
  // Preserve room store across Next.js dev reloads
  var __watchPartyRoomStore: Map<string, ActiveRoom> | undefined;
}

const roomStore: Map<string, ActiveRoom> = global.__watchPartyRoomStore ?? new Map<string, ActiveRoom>();
global.__watchPartyRoomStore = roomStore;

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

export function createRoom(roomId: string, hostEmail: string, hostName: string, expiryHours: number): { success: boolean; error?: string; room?: ActiveRoom } {
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
