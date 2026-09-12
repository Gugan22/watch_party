import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRoom, kickParticipant } from '@/lib/room-store';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized: You must be signed in as host to remove participants.' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { roomId, participantId } = body as { roomId?: string; participantId?: string };

  if (!roomId || !participantId) {
    return NextResponse.json({ error: 'Missing roomId or participantId' }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (room && room.hostEmail && session.user.email.trim().toLowerCase() !== room.hostEmail.toLowerCase()) {
    return NextResponse.json(
      { error: 'Unauthorized: Only the creator of this room can remove participants.' },
      { status: 403 }
    );
  }

  const success = kickParticipant(roomId, participantId);
  return NextResponse.json({ success, kickedId: participantId });
}
