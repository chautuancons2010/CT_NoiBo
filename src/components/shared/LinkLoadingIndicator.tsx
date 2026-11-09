"use client";

import { useLinkStatus } from "next/link";

import { useLoadingActivity } from "@/lib/ui/useLoadingActivity";

export function LinkLoadingIndicator() {
  const { pending } = useLinkStatus();
  useLoadingActivity(pending, "page");
  return null;
}
