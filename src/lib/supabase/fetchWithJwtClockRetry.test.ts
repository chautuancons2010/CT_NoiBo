// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithJwtClockRetry } from "./fetchWithJwtClockRetry";
import { getSupabaseServiceClient } from "./server";

const rpcUrl = "https://example.supabase.co/rest/v1/rpc/check_auth_login_allowed";
const clockError = () => Response.json({ code: "PGRST303", message: "JWT issued at future" }, { status: 401 });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("Supabase JWT clock recovery", () => {
  it("recovers a service client RPC without bypassing its authorization check", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-service-key");
    const fetchMock = vi.fn().mockResolvedValueOnce(clockError()).mockResolvedValueOnce(Response.json(false));
    vi.stubGlobal("fetch", fetchMock);
    const client = getSupabaseServiceClient()!;
    const pending = Promise.resolve(client.rpc("check_auth_login_allowed", { p_key_hash: "test-hash" }));
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
    await vi.advanceTimersByTimeAsync(500);
    const result = await pending;
    expect(result.error).toBeNull();
    expect(result.data).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("replays an RPC body and credentials after the gateway rejects its JWT", async () => {
    vi.useFakeTimers();
    const requests: Array<{ method: string; body: string; authorization: string | null }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push({ method: request.method, body: await request.text(), authorization: request.headers.get("authorization") });
      return requests.length === 1 ? clockError() : Response.json(true);
    });
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request(rpcUrl, { method: "POST", headers: { authorization: "Bearer test-service-key" }, body: JSON.stringify({ p_key_hash: "test-hash" }) });
    const pending = fetchWithJwtClockRetry(request);
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
    await vi.advanceTimersByTimeAsync(500);
    const response = await pending;
    expect(await response.json()).toBe(true);
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
    expect(requests[1].method).toBe("POST");
  });

  it("bypasses Next.js GET memoization when retrying while preserving fetch options", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValueOnce(clockError()).mockResolvedValueOnce(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);
    const options = { cache: "no-store" as const, headers: { authorization: "Bearer test-service-key" } };
    const pending = fetchWithJwtClockRetry("https://example.supabase.co/rest/v1/app_accounts", options);
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
    await vi.advanceTimersByTimeAsync(500);
    expect((await pending).ok).toBe(true);
    expect(fetchMock.mock.calls[0][1]).toBe(options);
    expect(fetchMock.mock.calls[1][1]).toMatchObject(options);
    expect(fetchMock.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [401, { code: "PGRST303", message: "JWT expired" }],
    [401, { code: "PGRST301", message: "JWT issued at future" }],
    [403, { code: "42501", message: "permission denied" }],
    [429, { code: "RATE_LIMITED", message: "Too many requests" }],
    [500, { code: "SERVER_ERROR", message: "Database unavailable" }]
  ])("preserves unrelated errors without retrying (%i)", async (status, body) => {
    const response = Response.json(body, { status });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchWithJwtClockRetry(rpcUrl)).toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual(body);
  });

  it("returns the rejection after the retry budget is exhausted", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => clockError());
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetchWithJwtClockRetry(rpcUrl);
    for (const delay of [500, 1_500, 3_000]) {
      await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
      await vi.advanceTimersByTimeAsync(delay);
    }
    const response = await pending;
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "PGRST303", message: "JWT issued at future" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("cancels a pending retry when the caller aborts", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchMock = vi.fn(async () => clockError());
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetchWithJwtClockRetry(rpcUrl, { signal: controller.signal });
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
    controller.abort();
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not replay Auth requests", async () => {
    const response = clockError();
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchWithJwtClockRetry("https://example.supabase.co/auth/v1/token")).toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
