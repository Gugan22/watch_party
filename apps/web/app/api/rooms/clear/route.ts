import { NextResponse } from 'next/server';
import { clearAllRooms, getActiveRoomCount, getActiveRoomList } from '@/lib/room-store';

// POST: Clears all active rooms from memory
export async function POST() {
  const clearedCount = clearAllRooms();
  return NextResponse.json({
    success: true,
    message: `All active rooms have been cleared (${clearedCount} removed).`,
    clearedRooms: clearedCount,
    deployId: process.env.NEXT_PUBLIC_DEPLOY_ID || 'fresh',
  });
}

// GET: Returns current active room count and room IDs
export async function GET() {
  const count = getActiveRoomCount();
  return NextResponse.json({
    activeRooms: count,
    rooms: getActiveRoomList(),
    deployId: process.env.NEXT_PUBLIC_DEPLOY_ID || 'fresh',
  });
}
