import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kickParticipant } from '@/lib/room-store';

const HOST_EMAIL = 'gugan2206@gmail.com';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email.trim().toLowerCase() !== HOST_EMAIL) {
    return NextResponse.json(
      { error: 'Unauthorized: Only the room host can remove participants.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { roomId, participantId } = body as { roomId?: string; participantId?: string };

  if (!roomId || !participantId) {
    return NextResponse.json({ error: 'Missing roomId or participantId' }, { status: 400 });
  }

  const success = kickParticipant(roomId, participantId);
  return NextResponse.json({ success, kickedId: participantId });
}
