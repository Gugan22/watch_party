import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createRoom } from '@/lib/room-store';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Authentication required. Please sign in with Google to create a room.' },
      { status: 401 }
    );
  }

  const userEmail = session.user.email.trim().toLowerCase();

  const body = await request.json().catch(() => ({}));
  const { roomName, roomId, expiryHours } = body as {
    roomName?: string;
    roomId?: string;
    expiryHours?: number;
  };

  const displayName = (roomName || roomId || 'Watch Party').trim();

  // App automatically generates a unique URL-safe room ID from the room name
  let cleanRoomId = (roomId || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!cleanRoomId || cleanRoomId.length < 3) {
    const slug = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'cinema';
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    cleanRoomId = `${slug}-${randomSuffix}`;
  }

  const parsedExpiry = typeof expiryHours === 'number' ? expiryHours : 6;
  if (parsedExpiry < 4 || parsedExpiry > 12) {
    return NextResponse.json({ error: 'Link expiry must be strictly between 4 and 12 hours' }, { status: 400 });
  }

  // Enforce unique room ID in in-memory room store
  const result = createRoom(cleanRoomId, displayName, userEmail, session.user.name || 'Host', parsedExpiry);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const roomUrl = `${baseUrl}/room/${cleanRoomId}`;

  return NextResponse.json({
    success: true,
    roomId: cleanRoomId,
    roomName: displayName,
    roomUrl,
    expiresAt: result.room?.expiresAt,
    hostEmail: userEmail,
  });
}
