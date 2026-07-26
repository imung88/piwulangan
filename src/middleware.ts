import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;
  const pathname = req.nextUrl.pathname;

  // Public routes
  const publicRoutes = ["/login", "/signup", "/"];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Not logged in → redirect to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin routes
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Guardian can only access dashboard, profile, and schedule (read-only)
  if (role === "GUARDIAN") {
    const allowed = ["/dashboard", "/profile", "/schedule", "/notifications"];
    if (!allowed.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
