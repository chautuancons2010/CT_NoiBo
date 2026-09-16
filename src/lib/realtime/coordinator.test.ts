import { afterEach, describe, expect, it, vi } from "vitest";

import {
  emitRealtimeInvalidation,
  getRealtimeConnectionState,
  markRealtimeTransportState,
  resetRealtimeCoordinatorForTests,
  startRealtimeCoordinator,
  subscribeRealtimeDomain
} from "@/lib/realtime/coordinator";

afterEach(() => {
  resetRealtimeCoordinatorForTests();
  vi.restoreAllMocks();
});

describe("realtime coordinator", () => {
  it("deduplicates a committed event across local and remote delivery", () => {
    const listener = vi.fn();
    subscribeRealtimeDomain("warehouse", listener);
    const event = { version: 1, domain: "warehouse", key: "ledger:42:v3", source: "postgres", occurredAt: "2026-09-14T08:00:00.000Z" } as const;

    expect(emitRealtimeInvalidation(event)).toBe(true);
    expect(emitRealtimeInvalidation({ ...event, source: "remote-tab" })).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("reports degraded transport without describing the database as offline", () => {
    markRealtimeTransportState("connected");
    expect(getRealtimeConnectionState()).toBe("connected");
    markRealtimeTransportState("error");
    expect(getRealtimeConnectionState()).toBe("degraded");
  });

  it("reconciles mounted domains after the browser returns online and cleans listeners", () => {
    const listener = vi.fn();
    subscribeRealtimeDomain("notifications", listener);
    const stop = startRealtimeCoordinator("account-1");

    window.dispatchEvent(new Event("online"));
    expect(listener).toHaveBeenCalledOnce();
    expect(getRealtimeConnectionState()).toBe("reconnecting");

    stop();
    window.dispatchEvent(new Event("online"));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("keeps lifecycle listeners balanced across repeated mount and unmount cycles", () => {
    const added = vi.spyOn(window, "addEventListener");
    const removed = vi.spyOn(window, "removeEventListener");

    for (let cycle = 0; cycle < 30; cycle += 1) {
      const stop = startRealtimeCoordinator("account-1");
      stop();
    }

    const focusAdds = added.mock.calls.filter(([type]) => type === "focus").length;
    const focusRemovals = removed.mock.calls.filter(([type]) => type === "focus").length;
    expect(focusAdds).toBe(30);
    expect(focusRemovals).toBe(focusAdds);
  });
});
