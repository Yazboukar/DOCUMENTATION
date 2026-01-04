import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const res = NextResponse.next();
    const sectorMatch = req.nextUrl.pathname.match(/^\/s\/([^/]+)/);
    if (sectorMatch?.[1]) {
      res.cookies.set("sector", sectorMatch[1], { path: "/" });
    }
    return res;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname.startsWith("/login")) return true;
        if (pathname === "/") return !!token;
        if (pathname.startsWith("/s") || pathname.startsWith("/admin")) {
          return !!token;
        }
        return !!token;
      }
    }
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
