import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const accessCookie = "ct_access_token";
const refreshCookie = "ct_refresh_token";
const refreshWindowSeconds = 5 * 60;

function accessTokenExpiresSoon(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    return typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1_000) + refreshWindowSeconds;
  } catch {
    return true;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;
  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store"
    });
    if (!response.ok) return undefined;
    const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!data.access_token || !data.refresh_token || typeof data.expires_in !== "number") return undefined;
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
  } catch {
    return undefined;
  }
}

export async function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || randomUUID();
  if (request.nextUrl.pathname.startsWith("/api/") && mutatingMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    const allowedOrigin = new URL(process.env.APP_BASE_URL || request.nextUrl.origin).origin;
    if (origin && origin !== request.nextUrl.origin && origin !== allowedOrigin) {
      return NextResponse.json({ ok: false, error: { code: "PERMISSION_DENIED", message: "Nguồn yêu cầu không hợp lệ.", requestId } }, { status: 403, headers: { "cache-control": "no-store", "x-request-id": requestId } });
    }
  }
  const accessToken = request.cookies.get(accessCookie)?.value;
  const refreshToken = request.cookies.get(refreshCookie)?.value;
  let refreshed: Awaited<ReturnType<typeof refreshAccessToken>>;
  if (accessToken && refreshToken && accessTokenExpiresSoon(accessToken)) {
    refreshed = await refreshAccessToken(refreshToken);
    if (refreshed) {
      request.cookies.set(accessCookie, refreshed.accessToken);
      request.cookies.set(refreshCookie, refreshed.refreshToken);
    }
  }

  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  if (refreshed) {
    response.cookies.set(accessCookie, refreshed.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.max(60, refreshed.expiresIn) });
    response.cookies.set(refreshCookie, refreshed.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
