
import { NextRequest, NextResponse } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const user = request.cookies.get('user');
  
  const headers = new Headers(request.headers);
  
  if (user) {
    try {
      const userData = JSON.parse(user.value);
      if (userData.username) {
         headers.set('x-user-id', userData.username);
      }
    } catch (e) {
      // ignore invalid cookie
    }
  }

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: '/api/:path*',
}

    