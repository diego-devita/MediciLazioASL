import { jwtVerify } from 'jose';

export async function middleware(request) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Route pubbliche (non richiedono autenticazione)
  const publicRoutes = [
    '/login',
    '/login.html',
    '/api/login',
    '/api/webhook',
    '/api/cron'
  ];

  // Se è una route pubblica, lascia passare
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return new Response(null, { status: 200 });
  }

  // Estrai cookie dall'header
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...v] = c.split('=');
      return [key, v.join('=')];
    })
  );

  const token = cookies.auth_token;

  if (!token) {
    // Non autenticato → redirect a /login
    return Response.redirect(new URL('/login', request.url));
  }

  try {
    // Valida JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    // Token valido → continua
    return new Response(null, { status: 200 });
  } catch (error) {
    // Token invalido → redirect a /login
    return Response.redirect(new URL('/login', request.url));
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
