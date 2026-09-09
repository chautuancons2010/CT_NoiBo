import { cn } from "@/lib/utils/cn";

type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

export interface StatusBadgeProps {
  children: string;
  tone?: StatusTone;
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={cn("status-badge", `status-badge--${tone}`)}>{children}</span>;
}
