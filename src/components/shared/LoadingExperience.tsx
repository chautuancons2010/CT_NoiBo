"use client";

import type { CSSProperties } from "react";

import { usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { applicationForPath } from "@/config/moduleRegistry";
import { cn } from "@/lib/utils/cn";
import styles from "./LoadingExperience.module.css";

export function CardSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn(styles.card, styles.sheen, className)}><span /><span /><span /></div>;
}

export function ChartSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn(styles.chart, styles.sheen, className)}><span /><div><i /><i /><i /><i /></div></div>;
}

export function TableSkeleton({ rows = 5, columns = 3, className }: { rows?: number; columns?: number; className?: string }) {
  const count = Math.max(1, Math.min(columns, 8));
  return <div aria-hidden="true" className={cn(styles.table, styles.sheen, className)} style={{ "--skeleton-columns": count } as CSSProperties}>{Array.from({ length: rows }, (_, index) => <span key={index}>{Array.from({ length: count }, (_, column) => <i key={column} />)}</span>)}</div>;
}

export function ContentSkeleton() {
  return <div aria-hidden="true" className={styles.content}><div className={styles.contentHeading}><span /><span /></div><TableSkeleton rows={3}/></div>;
}

export function PageSkeleton() {
  return <div aria-label="Đang tải trang" className={styles.page} data-ui="page-skeleton" role="status"><LoadingSpinner /><span className="sr-only">Đang tải trang</span><div aria-hidden="true" className={styles.pageHeading}><span /><span /></div><div className={styles.cards}><CardSkeleton /><CardSkeleton /><CardSkeleton /></div><TableSkeleton /></div>;
}

export function ModuleTransition() {
  const pathname = usePathname();
  const application = applicationForPath(pathname);
  return (
    <div aria-label={`Đang mở ${application.label}`} className="module-transition" role="status">
      <LoadingSpinner />
      <span className="sr-only">Đang mở {application.label}</span>
    </div>
  );
}

export const GlobalRouteLoader = ModuleTransition;
