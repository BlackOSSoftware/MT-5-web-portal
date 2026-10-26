import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const accessToken = req.cookies.get("accessToken")?.value;
  const tradeToken = req.cookies.get("tradeToken")?.value;

  // TRADE LOGIN PAGE
  if (pathname === "/trade-login") {
    const fromManageAccounts =
      req.nextUrl.searchParams.get("manageAccounts") === "1";
    const switchAccount =
      req.nextUrl.searchParams.get("switch") === "1";
    // Dashboard "Trade" for another account uses ?account=… — must not bounce to old session.
    const accountSwitch = Boolean(
      req.nextUrl.searchParams.get("account")?.trim()
    );

    if (
      tradeToken &&
      !fromManageAccounts &&
      !switchAccount &&
      !accountSwitch
    ) {
      return NextResponse.redirect(new URL("/trade", req.url));
    }
    return NextResponse.next();
  }

  // TRADE PANEL
  if (pathname.startsWith("/trade")) {
    if (!tradeToken) {
      return NextResponse.redirect(new URL("/trade-login", req.url));
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
