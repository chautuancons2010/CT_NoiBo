"use client";

import { useEffect, useRef } from "react";

import { subscribeRealtimeDomain, type RealtimeDomain } from "@/lib/realtime/coordinator";
import { errorFingerprint, logger } from "@/lib/logger";

export function useDomainReconciliation(domain: RealtimeDomain, reconcile: () => unknown | Promise<unknown>): void {
  const latest = useRef(reconcile);
  const running = useRef(false);
  const queued = useRef(false);
  useEffect(() => { latest.current = reconcile; }, [reconcile]);
  useEffect(() => {
    let mounted = true;

    async function run() {
      if (running.current) {
        queued.current = true;
        return;
      }
      running.current = true;
      try {
        do {
          queued.current = false;
          try {
            await latest.current();
          } catch (error) {
            logger.warn("realtime.reconciliation_failed", {
              metadata: { domain, fingerprint: errorFingerprint(error) }
            });
          }
        } while (mounted && queued.current);
      } finally {
        running.current = false;
      }
    }

    const unsubscribe = subscribeRealtimeDomain(domain, () => { void run(); });
    return () => {
      mounted = false;
      queued.current = false;
      unsubscribe();
    };
  }, [domain]);
}
