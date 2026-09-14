"use client";

import { useEffect, useRef } from "react";

import { subscribeRealtimeDomain, type RealtimeDomain } from "@/lib/realtime/coordinator";

export function useDomainReconciliation(domain: RealtimeDomain, reconcile: () => unknown | Promise<unknown>): void {
  const latest = useRef(reconcile);
  useEffect(() => { latest.current = reconcile; }, [reconcile]);
  useEffect(() => subscribeRealtimeDomain(domain, () => { void latest.current(); }), [domain]);
}
