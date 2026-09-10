import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export type StatusBadgeTone = "neutral" | "success" | "warning" | "error" | "info";

export interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusBadgeTone;
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={cn("status-badge", `status-badge--${tone}`)}>{children}</span>;
}
