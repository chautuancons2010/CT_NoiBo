const retryDelaysMs = [500, 1_500, 3_000] as const;

export function isJwtClockError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  return value.code === "PGRST303" && value.message === "JWT issued at future";
}

function waitForRetry(delayMs: number, signal?: AbortSignal | null): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** Retry only JWT validation rejections, which happen before PostgREST runs SQL. */
export const fetchWithJwtClockRetry: typeof fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  // Auth/storage failures and streaming request bodies must not be replayed.
  if (!new URL(url).pathname.startsWith("/rest/v1/") || init?.body instanceof ReadableStream) {
    return fetch(input, init);
  }

  const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  for (let attempt = 0; ; attempt += 1) {
    signal?.throwIfAborted();
    // A signal prevents Next.js from memoizing the rejected GET on retries.
    const options = attempt === 0 ? init : { ...init, signal: signal ?? new AbortController().signal };
    const response = await fetch(input instanceof Request ? input.clone() : input, options);
    if (response.status !== 401 || attempt >= retryDelaysMs.length) return response;
    const error: unknown = await response.clone().json().catch(() => undefined);
    if (!isJwtClockError(error)) return response;
    await waitForRetry(retryDelaysMs[attempt], signal);
  }
};
