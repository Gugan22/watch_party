import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Intercept room routes: /room/[roomId]
  if (pathname.startsWith('/room/')) {
    const segments = pathname.split('/').filter(Boolean);
    const roomId = segments[1];

    if (roomId) {
      // Check if visitor explicitly requested web browser mode or previously skipped
      const skipParam = searchParams.get('browser') === 'true';
      const skipCookie = request.cookies.get('wp_skip_mobile')?.value === 'true';

      if (!skipParam && !skipCookie) {
        const userAgent = request.headers.get('user-agent') || '';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        if (isMobile) {
          const downloadUrl = new URL('/download', request.url);
          downloadUrl.searchParams.set('roomId', roomId);
          return NextResponse.redirect(downloadUrl);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/room/:path*'],
};
