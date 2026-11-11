import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieNames, stagingAuthorized } from "@/lib/testing/policy.mjs";
import { lockedModuleForRequestPath, moduleForRequestPath } from "@/config/moduleAccess";
import { hasUnrestrictedReleaseAccess, isReleasedFeaturePath } from "@/config/featureRelease";
import { moduleLabels } from "@/config/systemSettings";
import { readModuleSettings } from "@/services/system-settings/systemSettingsService";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const accessCookie = sessionCookieNames().access;
const refreshCookie = sessionCookieNames().refresh;
const sessionCookie = sessionCookieNames().session;
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

async function readReleaseRoleCodes(request: NextRequest): Promise<string[]> {
  const sessionId = request.cookies.get(sessionCookie)?.value;
  if (!sessionId || !request.cookies.get(accessCookie)?.value) return [];
  const databaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!databaseUrl || !serviceKey) return [];
  try {
    const endpoint = new URL("/rest/v1/app_sessions", databaseUrl);
    endpoint.searchParams.set("id", `eq.${sessionId}`);
    endpoint.searchParams.set("revoked_at", "is.null");
    endpoint.searchParams.set("expires_at", `gt.${new Date().toISOString()}`);
    endpoint.searchParams.set("select", "account:app_accounts!app_sessions_account_id_fkey(status,account_roles!account_roles_account_id_fkey(roles(code)))");
    const response = await fetch(endpoint, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(2_000)
    });
    if (!response.ok) return [];
    const rows = await response.json() as Array<{ account?: { status?: string; account_roles?: Array<{ roles?: { code?: string } | null }> } | null }>;
    const account = rows[0]?.account;
    if (account?.status !== "active") return [];
    return (account.account_roles ?? []).map((assignment) => assignment.roles?.code).filter((code): code is string => typeof code === "string");
  } catch {
    return [];
  }
}

export async function proxy(request: NextRequest) {
  if (!stagingAuthorized(request.headers.get("authorization"))) {
    return new NextResponse("Staging access required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="CT NoiBo Staging", charset="UTF-8"', "cache-control": "no-store" } });
  }
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || randomUUID();
  let roleCodes: string[] | undefined;
  if (!isReleasedFeaturePath(request.nextUrl.pathname, request.method)) {
    roleCodes = await readReleaseRoleCodes(request);
    if (!isReleasedFeaturePath(request.nextUrl.pathname, request.method, roleCodes)) {
      if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ ok: false, error: { code: "MODULE_LOCKED", message: "Chức năng đang khóa trong đợt triển khai chấm công.", requestId } }, { status: 423, headers: { "cache-control": "no-store" } });
      const destination = new URL("/module-locked", request.url);
      destination.searchParams.set("module", moduleForRequestPath(request.nextUrl.pathname) ?? "operations");
      return NextResponse.redirect(destination);
    }
  }
  if (request.nextUrl.pathname.startsWith("/api/") && mutatingMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    // The dev server can normalize nextUrl to localhost even when a phone
    // connects through the machine's LAN address. Check the actual Host too.
    const requestOrigin = new URL(`${request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`).origin;
    const allowedOrigin = new URL(process.env.APP_BASE_URL || requestOrigin).origin;
    if (origin && origin !== requestOrigin && origin !== allowedOrigin) {
      return NextResponse.json({ ok: false, error: { code: "PERMISSION_DENIED", message: "Nguồn yêu cầu không hợp lệ.", requestId } }, { status: 403, headers: { "cache-control": "no-store", "x-request-id": requestId } });
    }
  }
  const moduleKey = moduleForRequestPath(request.nextUrl.pathname);
  if (moduleKey) {
    try {
      const locked = lockedModuleForRequestPath(request.nextUrl.pathname, await readModuleSettings({ maxAgeMs: mutatingMethods.has(request.method) ? 2_000 : 5_000, allowStaleOnError: true }));
      if (locked) {
        roleCodes ??= await readReleaseRoleCodes(request);
        if (!hasUnrestrictedReleaseAccess(roleCodes)) {
          if (request.nextUrl.pathname.startsWith("/api/")) {
            return NextResponse.json({ ok: false, error: { code: "MODULE_LOCKED", message: `Module ${moduleLabels[locked]} đang tạm khóa.`, requestId } }, { status: 423, headers: { "cache-control": "no-store", "x-request-id": requestId } });
          }
          const destination = new URL("/module-locked", request.url);
          destination.searchParams.set("module", locked);
          return NextResponse.redirect(destination, { headers: { "cache-control": "no-store", "x-request-id": requestId } });
        }
      }
    } catch {
      return NextResponse.json({ ok: false, error: { code: "NETWORK_ERROR", message: "Không thể kiểm tra trạng thái module. Vui lòng thử lại.", requestId } }, { status: 503, headers: { "cache-control": "no-store", "x-request-id": requestId } });
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
