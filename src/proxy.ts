import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'taskforge_session';

/** Routes that render the app shell and always need a signed-in user. */
const PROTECTED_PREFIXES = ['/', '/inbox', '/today', '/upcoming', '/completed', '/important', '/focus', '/stats', '/settings'];
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

function isProtected(pathname: string): boolean {
  if (pathname === '/') return true;
  return PROTECTED_PREFIXES.some((prefix) => prefix !== '/' && pathname.startsWith(prefix));
}

function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'unsafe-inline'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // Tailwind and React both emit inline style attributes; scripts are the real risk surface.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    isDev ? `connect-src 'self' ws: wss:` : `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export default function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // A cookie only decides which page to *render*; every route re-checks the
  // session against the database before touching data.
  if (!hasSession && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_ROUTES.includes(pathname) && pathname !== '/reset-password') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce, process.env.NODE_ENV !== 'production');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, which need no CSP or auth check.
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)',
  ],
};
