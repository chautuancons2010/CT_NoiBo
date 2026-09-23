"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

import { navigationIconMap } from "@/components/layout/icons";
import { applicationForPath } from "@/config/moduleRegistry";
import { cn } from "@/lib/utils/cn";

export function CardSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton-card", className)}><span /><span /><span /></div>;
}

export function ChartSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton-chart", className)}><span /><i /><i /><i /><i /></div>;
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton-table", className)}>{Array.from({ length: rows }, (_, index) => <span key={index}><i /><i /><i /></span>)}</div>;
}

export function PageSkeleton() {
  return <div aria-label="Đang tải trang" className="page-skeleton" role="status"><div className="page-skeleton__heading"><span /><span /></div><div className="page-skeleton__cards"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div><TableSkeleton /></div>;
}

export function ModuleTransition() {
  const pathname = usePathname();
  const application = applicationForPath(pathname);
  const Icon = navigationIconMap[application.icon];
  return (
    <div className="module-transition" role="status" style={{ "--module-accent": application.accentColor, "--module-surface": application.accentSoft } as CSSProperties}>
      <span><Icon aria-hidden="true" size={26} strokeWidth={1.8} /></span>
      <strong>Đang mở {application.label}…</strong>
      <div aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}

export const GlobalRouteLoader = ModuleTransition;
