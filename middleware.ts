import type { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';

const { auth } = NextAuth(authConfig);

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method);
}

function isAllowedRole(role: UserRole | undefined, allowedRoles: UserRole[]) {
  return role ? allowedRoles.includes(role) : false;
}

function createLoginRedirect(requestUrl: URL) {
  const loginUrl = new URL('/auth/login', requestUrl);
  loginUrl.searchParams.set('callbackUrl', requestUrl.href);
  return NextResponse.redirect(loginUrl);
}

function createApiError(status: 401 | 403, error: string) {
  return NextResponse.json({ error }, { status });
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth?.user);
  const role = request.auth?.user?.role;
  const isApiV1Write =
    pathname.startsWith('/api/v1') && isWriteMethod(request.method);
  const isProtectedApi = isApiV1Write || pathname.startsWith('/api/ai');
  const isDashboard = pathname.startsWith('/dashboard');
  const isProfile = pathname.startsWith('/profile');
  const isAdmin = pathname.startsWith('/admin');

  if (!(isProtectedApi || isDashboard || isProfile || isAdmin)) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return isProtectedApi
      ? createApiError(HTTP_UNAUTHORIZED, 'Unauthorized')
      : createLoginRedirect(request.nextUrl);
  }

  if (isAdmin && !isAllowedRole(role, ['ADMIN'])) {
    return isProtectedApi
      ? createApiError(HTTP_FORBIDDEN, 'Forbidden')
      : NextResponse.redirect(new URL('/', request.nextUrl));
  }

  if (isDashboard && !isAllowedRole(role, ['ADMIN', 'EMPLOYER'])) {
    return NextResponse.redirect(new URL('/profile', request.nextUrl));
  }

  if (isProfile && !isAllowedRole(role, ['ADMIN', 'CANDIDATE'])) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/api/v1/:path*',
    '/api/ai/:path*',
  ],
};
