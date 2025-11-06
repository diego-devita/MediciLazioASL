import { jwtVerify } from 'jose';

export default async function middleware(request) {
  const url = new URL(request.url);
  const { pathname } = url;

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

    // Token valido → continua (non ritornare nulla, lascia passare)
    return;
  } catch (error) {
    // Token invalido → redirect a /login
    return Response.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match tutte le route eccetto:
     * - /login e /login.html (pagina di login)
     * - /api/login (endpoint login)
     * - /api/webhook (webhook Telegram)
     * - /api/cron (usa autenticazione API key, non JWT)
     * - file statici
     */
    '/((?!login|api/login|api/webhook|api/cron|_next/static|_next/image|favicon.ico).*)',
  ],
};
