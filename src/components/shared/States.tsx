import { AlertTriangle, Ban, Inbox, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { RetryButton } from "@/components/shared/RetryButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ContentSkeleton } from "@/components/shared/LoadingExperience";
import { cn } from "@/lib/utils/cn";

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <div className={cn("state-box", "state-box--empty", className)}>
      <Inbox aria-hidden="true" size={22} />
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

export function LoadingState({
  title = "Đang tải dữ liệu",
  className
}: Partial<StateProps>) {
  return (
    <div aria-busy="true" aria-label={title} aria-live="polite" className={cn("state-box state-box--loading", className)} role="status">
      <span className="sr-only">{title}</span>
      <LoadingSpinner />
      <ContentSkeleton />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton", className)} />;
}

export function ErrorState({
  title = "Không thể tải dữ liệu",
  description,
  action,
  className
}: Partial<StateProps>) {
  return (
    <div role="alert" className={cn("state-box state-box--error", className)}>
      <AlertTriangle aria-hidden="true" size={22} />
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ?? <RetryButton />}
    </div>
  );
}

export function PermissionDeniedState({
  title = "Không có quyền truy cập",
  description,
  className
}: Partial<StateProps>) {
  return (
    <div role="alert" className={cn("state-box state-box--warning", className)}>
      <Ban aria-hidden="true" size={22} />
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export const NoPermission = PermissionDeniedState;

export function OfflineState({
  title = "Đang offline",
  description,
  className
}: Partial<StateProps>) {
  return (
    <div role="status" className={cn("state-box state-box--info", className)}>
      <WifiOff aria-hidden="true" size={22} />
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
