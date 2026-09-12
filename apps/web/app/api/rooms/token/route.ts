import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AccessToken } from 'livekit-server-sdk';
import { getRoom, isParticipantKicked } from '@/lib/room-store';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? 'secret12345678901234567890123456789012';
const LIVEKIT_WS_URL = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL ?? process.env.LIVEKIT_WS_URL ?? 'ws://localhost:7880';
const HOST_EMAIL = 'gugan2206@gmail.com';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await request.json().catch(() => ({}));
  const { roomId, displayName, identity: clientIdentity } = body as {
    roomId?: string;
    displayName?: string;
    identity?: string;
  };

  const cleanRoomId = (roomId || '').trim().toLowerCase();
  if (!cleanRoomId) {
    return NextResponse.json({ error: 'Room ID is required to join' }, { status: 400 });
  }

  // Check if room exists
  const room = getRoom(cleanRoomId);
  if (!room) {
    return NextResponse.json(
      { error: `Room "${cleanRoomId}" was not found or has expired. Please verify the Room ID.` },
      { status: 404 }
    );
  }

  // Determine if caller is the authenticated host
  const isHost = session?.user?.email?.trim().toLowerCase() === HOST_EMAIL;

  // Participant identity & display name
  const participantIdentity = isHost
    ? HOST_EMAIL
    : clientIdentity || `guest-${Math.random().toString(36).substring(2, 9)}`;

  // Verify participant has not been kicked by host
  if (isParticipantKicked(cleanRoomId, participantIdentity)) {
    return NextResponse.json(
      { error: 'You have been removed from this party by the host.' },
      { status: 403 }
    );
  }

  const participantName = isHost
    ? (session?.user?.name || 'Gugan (Host)')
    : (displayName?.trim() || 'Guest');

  // Mint LiveKit access token
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    metadata: JSON.stringify({ isHost }),
  });

  at.addGrant({
    roomJoin: true,
    room: cleanRoomId,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({
    success: true,
    token,
    wsUrl: LIVEKIT_WS_URL,
    roomId: cleanRoomId,
    isHost,
    user: {
      name: participantName,
      identity: participantIdentity,
      isHost,
    },
    expiresAt: room.expiresAt,
  });
}
