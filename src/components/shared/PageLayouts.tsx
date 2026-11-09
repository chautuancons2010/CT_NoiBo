import type { ReactNode } from "react";
import { ChevronDown, LockKeyhole } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type LayoutProps = { children: ReactNode; className?: string };

export function PageContainer({ children, className }: LayoutProps) {
  return <div className={cn("page-container", className)}>{children}</div>;
}

/** The only content-width wrapper permitted for new pages. */
export function PageContent({ children, className }: LayoutProps) {
  return <div className={cn("page-content", className)}>{children}</div>;
}

export function ListPageLayout({ children, className }: LayoutProps) {
  return <div className={cn("list-page-layout", "screen-template--data", className)}>{children}</div>;
}

export function FormPageLayout({ children, className }: LayoutProps) {
  return <div className={cn("form-page-layout", "screen-template--process", className)}>{children}</div>;
}

export function DetailPageLayout({ children, className }: LayoutProps) {
  return <div className={cn("detail-page-layout", "screen-template--detail", className)}>{children}</div>;
}

export function SplitView({ children, className }: LayoutProps) {
  return <div className={cn("split-view", className)}>{children}</div>;
}

export function DetailPanel({ children, className }: LayoutProps) {
  return <aside className={cn("detail-panel", className)}>{children}</aside>;
}

export interface RecordField { label: string; value?: ReactNode; sensitive?: boolean }

export function RecordFields({ items }: { items: RecordField[] }) {
  return <dl className="record-fields">{items.map(item => {
    const empty = item.value === undefined || item.value === null || item.value === "";
    return <div key={item.label}><dt>{item.label}</dt><dd data-empty={empty || undefined}>
      <div className="record-fields__value">{empty ? "Chưa có" : item.value}</div>
      {item.sensitive ? <span className="record-fields__privacy" title="Dữ liệu nhạy cảm"><LockKeyhole aria-hidden="true" size={13} /><span className="sr-only">Nhạy cảm</span></span> : null}
    </dd></div>;
  })}</dl>;
}

export function DataSurface({ children, className }: LayoutProps) {
  return <section className={cn("data-surface", "data-surface--workspace", className)}>{children}</section>;
}

export interface ListWorkspaceProps extends LayoutProps {
  label: string;
  navigation?: ReactNode;
  summary?: ReactNode;
  filters?: ReactNode;
  status?: ReactNode;
  footer?: ReactNode;
}

/** One task surface. Feature owners supply data and controls; this owns their order. */
export function ListWorkspace({ label, navigation, summary, filters, status, children, footer, className }: ListWorkspaceProps) {
  return <section aria-label={label} className={cn("data-surface", "list-workspace", className)} data-ui="list-workspace">
    {navigation ? <div className="list-workspace__navigation">{navigation}</div> : null}
    {summary ? <div className="list-workspace__summary">{summary}</div> : null}
    {filters ? <div className="list-workspace__filters" data-ui="filter-controls">{filters}</div> : null}
    {status ? <div className="list-workspace__status">{status}</div> : null}
    <div className="list-workspace__content">{children}</div>
    {footer ? <div className="list-workspace__footer">{footer}</div> : null}
  </section>;
}

export function WorkspaceMetrics({ items }: { items: Array<{ label: string; value: ReactNode; tone?: "warning" | "error"; primary?: boolean }> }) {
  return <dl className="workspace-metrics">{items.map(item => <div data-tone={item.tone} data-primary={item.primary || undefined} key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}

export function RecordSheet({ children, className }: LayoutProps) {
  return <div className={cn("record-sheet", className)} data-ui="record-sheet">{children}</div>;
}

export function RecordSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="record-section"><header><h2>{title}</h2>{action}</header><div>{children}</div></section>;
}

/** Supplementary records stay available without competing with the active task. */
export function SecondarySection({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return <details className="workspace-disclosure" data-ui="secondary-section"><summary><span>{title}</span>{count !== undefined ? <small>{count}</small> : null}<ChevronDown aria-hidden="true" size={16} /></summary><div>{children}</div></details>;
}

export function DataManagementWorkspace({ children, className }: LayoutProps) {
  return (
    <section className={cn("data-management-workspace", className)}>
      {children}
    </section>
  );
}

export function Section({ children, className }: LayoutProps) {
  return <section className={cn("section", className)}>{children}</section>;
}

export const PageSection = Section;

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <header className="section-header"><h2>{title}</h2>{action}</header>;
}

export function DashboardGrid({ children, className }: LayoutProps) {
  return <div className={cn("dashboard-grid", className)}>{children}</div>;
}

export function ContentGrid({ children, className }: LayoutProps) {
  return <div className={cn("content-grid", className)}>{children}</div>;
}

export function FullWidthWorkspace({ children, className }: LayoutProps) {
  return <div className={cn("full-width-workspace", className)}>{children}</div>;
}

export function NarrowFormContainer({ children, className }: LayoutProps) {
  return <div className={cn("narrow-form-container", className)}>{children}</div>;
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
