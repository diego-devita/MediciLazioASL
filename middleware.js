import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Route pubbliche (non richiedono autenticazione)
  const publicRoutes = [
    '/login',
    '/api/login',
    '/api/webhook',
    '/api/cron'
  ];

  // Se è una route pubblica, lascia passare
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Verifica JWT nel cookie
  const cookies = cookie.parse(request.headers.get('cookie') || '');
  const token = cookies.auth_token;

  if (!token) {
    // Non autenticato → redirect a /login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Valida JWT
    jwt.verify(token, process.env.JWT_SECRET);
    // Token valido → continua
    return NextResponse.next();
  } catch (error) {
    // Token invalido → redirect a /login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match tutte le route eccetto:
     * - _next/static (file statici)
     * - _next/image (ottimizzazione immagini)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
