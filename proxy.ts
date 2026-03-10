import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Define protected routes — exclude /api/auth/ so BetterAuth endpoints are public
  const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth/');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isProjectRoute = request.nextUrl.pathname.startsWith('/project/');

  if (!session && !isAuthRoute && (isProjectRoute || isApiRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from the login page to the dashboard
  if (session && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
