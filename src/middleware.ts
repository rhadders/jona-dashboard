import { NextResponse, type NextRequest } from "next/server";

/*
 * Zonder sessiecookie gaat een pagina meteen naar de inlogpagina. Dit is
 * alleen een snelle eerste grens: of de sessie echt geldig is, controleert de
 * layout van het dashboard tegen de database (`requireSession`), en elke
 * API-route controleert zelf.
 */
const SESSION_COOKIE = "jd_session";

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  // Alles behalve de inlog- en setuppagina, de API en statische bestanden.
  matcher: ["/((?!login|setup|api|_next/static|_next/image|icon.svg|jona-mark.svg|favicon.ico).*)"],
};
