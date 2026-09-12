import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AccessToken } from 'livekit-server-sdk';
import { getRoom, createRoom, isParticipantKicked } from '@/lib/room-store';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? 'secret12345678901234567890123456789012';
const LIVEKIT_WS_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_WS_URL ??
  process.env.LIVEKIT_WS_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'wss://watchparty-amber-psi.vercel.app'
    : 'ws://localhost:7880');

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

  // Verify room exists in active room store or provision for valid room links
  let room = getRoom(cleanRoomId);
  if (!room) {
    if (cleanRoomId.length >= 3) {
      const created = createRoom(cleanRoomId, 'Watch Party', '', 'Host', 12);
      room = created.room;
    }
  }

  if (!room) {
    return NextResponse.json(
      { error: 'This watch party room has ended or does not exist.', notFound: true },
      { status: 404 }
    );
  }

  // Determine if caller is the authenticated host of this room
  const userEmail = session?.user?.email?.trim().toLowerCase();
  const isHost = userEmail
    ? (room.hostEmail ? userEmail === room.hostEmail.toLowerCase() : true)
    : false;

  // Participant identity & display name
  const participantIdentity = isHost
    ? (userEmail || `host-${cleanRoomId}`)
    : clientIdentity || `guest-${Math.random().toString(36).substring(2, 9)}`;

  // Verify participant has not been kicked by host
  if (isParticipantKicked(cleanRoomId, participantIdentity)) {
    return NextResponse.json(
      { error: 'You have been removed from this party by the host.' },
      { status: 403 }
    );
  }

  const participantName = isHost
    ? (session?.user?.name ? `${session.user.name} (Host)` : 'Host')
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
