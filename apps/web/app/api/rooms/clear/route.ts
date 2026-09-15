import { NextResponse } from 'next/server';
import { clearAllRooms, getActiveRoomCount, getActiveRoomList } from '@/lib/room-store';

// POST: Clears all active rooms from memory
export async function POST() {
  const clearedCount = clearAllRooms();
  return NextResponse.json({
    success: true,
    message: `All active rooms have been cleared (${clearedCount} removed).`,
    clearedRooms: clearedCount,
    activeRooms: 0,
    deployId: process.env.NEXT_PUBLIC_DEPLOY_ID || 'fresh',
  });
}

// GET: Returns current active room count, or clears if ?action=clear or ?confirm=true
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('action') === 'clear' || searchParams.get('confirm') === 'true') {
    const clearedCount = clearAllRooms();
    return NextResponse.json({
      success: true,
      message: `All active rooms have been cleared (${clearedCount} removed).`,
      clearedRooms: clearedCount,
      activeRooms: 0,
      deployId: process.env.NEXT_PUBLIC_DEPLOY_ID || 'fresh',
    });
  }

  const count = getActiveRoomCount();
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    activeRooms: count,
    rooms: getActiveRoomList(),
    clearUrl: `${origin}/api/rooms/clear?action=clear`,
    deployId: process.env.NEXT_PUBLIC_DEPLOY_ID || 'fresh',
  });
}
