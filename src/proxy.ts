import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || randomUUID();
  if (request.nextUrl.pathname.startsWith("/api/") && mutatingMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    const allowedOrigin = new URL(process.env.APP_BASE_URL || request.nextUrl.origin).origin;
    if (origin && origin !== request.nextUrl.origin && origin !== allowedOrigin) {
      return NextResponse.json({ ok: false, error: { code: "PERMISSION_DENIED", message: "Nguồn yêu cầu không hợp lệ.", requestId } }, { status: 403, headers: { "cache-control": "no-store", "x-request-id": requestId } });
    }
  }
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
