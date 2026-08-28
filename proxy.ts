import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifyAuthToken } from "./app/lib/auth";

const publicPaths = new Set(["/login", "/privacy", "/terms", "/api/health", "/robots.txt", "/sitemap.xml"]);
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicPaths.has(path) || path.startsWith("/api/auth/") || path.startsWith("/_next/") || path.startsWith("/favicon") || path.startsWith("/og")) return NextResponse.next();
  const userId = await verifyAuthToken(request.cookies.get(AUTH_COOKIE)?.value);
  if (userId) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error:"请先使用邀请码登录。", code:"AUTH_REQUIRED" }, { status:401 });
  const login = new URL("/login", request.url); login.searchParams.set("next", path); return NextResponse.redirect(login);
}

export const config = { matcher:["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"] };
