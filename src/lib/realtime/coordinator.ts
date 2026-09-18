export type RealtimeDomain =
  | "approvals"
  | "attendance"
  | "dashboard"
  | "employees"
  | "import-export"
  | "leave"
  | "notifications"
  | "projects"
  | "settings"
  | "system-notices"
  | "timesheets"
  | "warehouse"
  | "worker-attendance";

export type RealtimeConnectionState = "connecting" | "connected" | "reconnecting" | "degraded" | "offline";
export type RealtimeInvalidationSource = "postgres" | "reconnect" | "resume" | "focus" | "poll" | "remote-tab";

export interface RealtimeInvalidation {
  version: 1;
  domain: RealtimeDomain;
  key: string;
  source: RealtimeInvalidationSource;
  occurredAt: string;
}

type InvalidationListener = (event: RealtimeInvalidation) => void;

const stateListeners = new Set<() => void>();
const invalidationListeners = new Map<RealtimeDomain, Set<InvalidationListener>>();
const seen = new Map<string, number>();
const lastLifecycleReconcile = new Map<RealtimeDomain, number>();
const SEEN_TTL_MS = 5 * 60_000;
const LIFECYCLE_RECONCILE_GAP_MS = 3_000;
const FALLBACK_RECONCILE_MS = 60_000;
const realtimeDomains = new Set<RealtimeDomain>([
  "approvals", "attendance", "dashboard", "employees", "import-export", "leave", "notifications",
  "projects", "settings", "system-notices", "timesheets", "warehouse", "worker-attendance"
]);

let state: RealtimeConnectionState = "connecting";
let stopLifecycle: (() => void) | undefined;
let lifecycleAccountId: string | undefined;
let lifecycleReferences = 0;

function setState(next: RealtimeConnectionState): void {
  if (state === next) return;
  state = next;
  stateListeners.forEach((listener) => listener());
}

function pruneSeen(now: number): void {
  for (const [key, timestamp] of seen) if (now - timestamp > SEEN_TTL_MS) seen.delete(key);
  if (seen.size > 1_000) seen.clear();
}

function accept(event: RealtimeInvalidation): boolean {
  const now = Date.now();
  pruneSeen(now);
  if (seen.has(event.key)) return false;
  seen.set(event.key, now);
  return true;
}

function notify(event: RealtimeInvalidation): void {
  invalidationListeners.get(event.domain)?.forEach((listener) => listener(event));
  if (event.domain !== "dashboard" && (event.source === "postgres" || event.source === "remote-tab")) {
    invalidationListeners.get("dashboard")?.forEach((listener) => listener(event));
  }
}

export function isRealtimeDomain(value: unknown): value is RealtimeDomain {
  return typeof value === "string" && realtimeDomains.has(value as RealtimeDomain);
}

export function getRealtimeConnectionState(): RealtimeConnectionState {
  return state;
}

export function getServerRealtimeConnectionState(): RealtimeConnectionState {
  return "connecting";
}

export function subscribeRealtimeConnection(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

export function subscribeRealtimeDomain(domain: RealtimeDomain, listener: InvalidationListener): () => void {
  const listeners = invalidationListeners.get(domain) ?? new Set<InvalidationListener>();
  listeners.add(listener);
  invalidationListeners.set(domain, listeners);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) invalidationListeners.delete(domain);
  };
}

export function emitRealtimeInvalidation(event: RealtimeInvalidation, broadcast?: (event: RealtimeInvalidation) => void): boolean {
  if (!accept(event)) return false;
  notify(event);
  broadcast?.(event);
  return true;
}

export function reconcileRealtimeDomain(domain: RealtimeDomain, source: Exclude<RealtimeInvalidationSource, "postgres" | "remote-tab">): void {
  const now = Date.now();
  if (now - (lastLifecycleReconcile.get(domain) ?? 0) < LIFECYCLE_RECONCILE_GAP_MS) return;
  lastLifecycleReconcile.set(domain, now);
  const bucket = Math.floor(Date.now() / 1_000);
  emitRealtimeInvalidation({ version: 1, domain, key: `reconcile:${domain}:${source}:${bucket}`, source, occurredAt: new Date().toISOString() });
}

export function markRealtimeTransportState(next: "connecting" | "connected" | "disconnected" | "error"): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) return setState("offline");
  if (next === "connected") setState("connected");
  else if (next === "connecting") setState(state === "connected" ? "reconnecting" : "connecting");
  else setState("degraded");
}

export function startRealtimeCoordinator(accountId: string): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (stopLifecycle && lifecycleAccountId === accountId) {
    lifecycleReferences += 1;
    return () => {
      lifecycleReferences -= 1;
      if (lifecycleReferences === 0) stopLifecycle?.();
    };
  }

  stopLifecycle?.();
  lifecycleAccountId = accountId;
  lifecycleReferences = 1;
  const channel = typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel(`ct-realtime:${accountId}`);
  const reconcileMountedDomains = (source: "reconnect" | "resume" | "focus" | "poll") => {
    for (const domain of invalidationListeners.keys()) reconcileRealtimeDomain(domain, source);
  };
  const online = () => { setState("reconnecting"); reconcileMountedDomains("reconnect"); };
  const offline = () => setState("offline");
  const visible = () => { if (document.visibilityState === "visible") reconcileMountedDomains("resume"); };
  const focus = () => reconcileMountedDomains("focus");
  const pageShow = () => reconcileMountedDomains("resume");
  const message = (event: MessageEvent<RealtimeInvalidation>) => {
    const value = event.data;
    if (!value || value.version !== 1 || !invalidationListeners.has(value.domain)) return;
    emitRealtimeInvalidation({ ...value, source: "remote-tab" });
  };

  channel?.addEventListener("message", message);
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  window.addEventListener("focus", focus);
  window.addEventListener("pageshow", pageShow);
  document.addEventListener("visibilitychange", visible);
  const fallback = window.setInterval(() => {
    if (navigator.onLine && document.visibilityState === "visible") reconcileMountedDomains("poll");
  }, FALLBACK_RECONCILE_MS);
  const degraded = window.setTimeout(() => {
    if (state === "connecting" || state === "reconnecting") setState("degraded");
  }, 5_000);
  setState(navigator.onLine ? "connecting" : "offline");

  stopLifecycle = () => {
    window.clearInterval(fallback);
    window.clearTimeout(degraded);
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
    window.removeEventListener("focus", focus);
    window.removeEventListener("pageshow", pageShow);
    document.removeEventListener("visibilitychange", visible);
    channel?.removeEventListener("message", message);
    channel?.close();
    stopLifecycle = undefined;
    lifecycleAccountId = undefined;
    lifecycleReferences = 0;
    seen.clear();
    lastLifecycleReconcile.clear();
  };
  return () => {
    lifecycleReferences -= 1;
    if (lifecycleReferences === 0) stopLifecycle?.();
  };
}

export function broadcastRealtimeInvalidation(event: RealtimeInvalidation): void {
  if (typeof BroadcastChannel === "undefined" || !lifecycleAccountId) return;
  const channel = new BroadcastChannel(`ct-realtime:${lifecycleAccountId}`);
  channel.postMessage(event);
  channel.close();
}

export function resetRealtimeCoordinatorForTests(): void {
  stopLifecycle?.();
  state = "connecting";
  seen.clear();
  lastLifecycleReconcile.clear();
  stateListeners.clear();
  invalidationListeners.clear();
}
