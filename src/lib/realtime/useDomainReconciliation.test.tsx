import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { emitRealtimeInvalidation, resetRealtimeCoordinatorForTests } from "@/lib/realtime/coordinator";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

afterEach(() => resetRealtimeCoordinatorForTests());

function Consumer({ reconcile }: { reconcile: () => Promise<void> }) {
  useDomainReconciliation("warehouse", reconcile);
  return null;
}

describe("useDomainReconciliation", () => {
  it("coalesces a burst while reconciliation is running", async () => {
    let finishFirst: (() => void) | undefined;
    const reconcile = vi.fn(() => new Promise<void>((resolve) => { finishFirst ??= resolve; }));
    render(<Consumer reconcile={reconcile} />);

    await act(async () => {
      for (let index = 0; index < 100; index += 1) {
        emitRealtimeInvalidation({ version: 1, domain: "warehouse", key: `event-${index}`, source: "postgres", occurredAt: new Date().toISOString() });
      }
      await Promise.resolve();
    });
    expect(reconcile).toHaveBeenCalledOnce();

    await act(async () => {
      finishFirst?.();
      await Promise.resolve();
    });
    expect(reconcile).toHaveBeenCalledTimes(2);
  });

  it("contains a rejected background reconciliation", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const reconcile = vi.fn(async () => { throw new Error("temporary failure"); });
    render(<Consumer reconcile={reconcile} />);
    await act(async () => {
      emitRealtimeInvalidation({ version: 1, domain: "warehouse", key: "failed-event", source: "postgres", occurredAt: new Date().toISOString() });
      await Promise.resolve();
    });
    expect(reconcile).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledOnce();
  });
});
