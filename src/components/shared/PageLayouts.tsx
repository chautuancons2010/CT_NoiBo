import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type LayoutProps = { children: ReactNode; className?: string };

export function PageContainer({ children, className }: LayoutProps) {
  return <div className={cn("page-container", className)}>{children}</div>;
}

export function ListPageLayout({ children, className }: LayoutProps) {
  return <div className={cn("list-page-layout", className)}>{children}</div>;
}

export function FormPageLayout({ children, className }: LayoutProps) {
  return <div className={cn("form-page-layout", className)}>{children}</div>;
}

export function DetailPageLayout({ children, className }: LayoutProps) {
  return <div className={cn("detail-page-layout", className)}>{children}</div>;
}

export function DataSurface({ children, className }: LayoutProps) {
  return <section className={cn("data-surface", className)}>{children}</section>;
}

export function Section({ children, className }: LayoutProps) {
  return <section className={cn("section", className)}>{children}</section>;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <header className="section-header"><h2>{title}</h2>{action}</header>;
}

export function DashboardGrid({ children, className }: LayoutProps) {
  return <div className={cn("dashboard-grid", className)}>{children}</div>;
}

export function DashboardPageTemplate({ children, className }: LayoutProps) {
  return <div className={cn("dashboard-page", className)}>{children}</div>;
}

export const ListPageTemplate = ListPageLayout;
export const FormPageTemplate = FormPageLayout;
export const DetailPageTemplate = DetailPageLayout;

export function ReportPageTemplate({ children, className }: LayoutProps) {
  return <div className={cn("report-page-layout", className)}>{children}</div>;
}
