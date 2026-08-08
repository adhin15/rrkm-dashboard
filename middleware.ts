import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route yang TIDAK perlu autentikasi
const PUBLIC_ROUTES = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session")?.value;

  // Route publik → izinkan tanpa cek
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Tidak ada session cookie → redirect ke login
  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Ada session → lanjut (validasi session dilakukan di server/API layer)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect semua route kecuali static assets & next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
