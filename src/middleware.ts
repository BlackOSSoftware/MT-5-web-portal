import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const accessToken = req.cookies.get("accessToken")?.value;
  const tradeToken = req.cookies.get("tradeToken")?.value;

  // Old password login screen was removed; trade sessions come from the portal login.
  if (pathname === "/trade-login") {
    return NextResponse.redirect(new URL("/trade-open", req.url));
  }

  // TRADE PANEL
  if (pathname.startsWith("/trade") && pathname !== "/trade-open") {
    if (!tradeToken) {
      return NextResponse.redirect(new URL(accessToken ? "/trade-open" : "/login", req.url));
    }
    return NextResponse.next();
  }

  // BROKER DASHBOARD
  if (pathname.startsWith("/dashboard")) {
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // LOGIN BLOCK
  if ((pathname === "/login" || pathname === "/signup") && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trade/:path*",
    "/login",
    "/signup",
    "/trade-login",
  ],
};
