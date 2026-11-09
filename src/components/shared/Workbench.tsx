import type { CSSProperties, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function WorkbenchLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("workbench-layout", className)}>{children}</div>;
}

export function CommandBar({ children, className, label = "Lệnh thao tác" }: { children: ReactNode; className?: string; label?: string }) {
  return <div aria-label={label} className={cn("command-bar", className)} role="toolbar">{children}</div>;
}

export function WorkCanvas({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("work-canvas", className)}>{children}</section>;
}

export function Inspector({ children, className, title }: { children: ReactNode; className?: string; title: string }) {
  return <aside aria-label={title} className={cn("workbench-inspector", className)}><h2>{title}</h2>{children}</aside>;
}

/** A stable action area for long document editors. Submitters stay in their owning form. */
export function DocumentActions({ children, context }: { children: ReactNode; context?: ReactNode }) {
  return <footer className="document-action-bar" data-ui="document-actions">
    {context ? <div className="document-action-bar__context">{context}</div> : null}
    <div className="document-action-bar__buttons">{children}</div>
  </footer>;
}

export interface EditableLineColumn { key: string; label: string; size?: string }

export function EditableLines({ children, columns }: { children: ReactNode; columns: EditableLineColumn[] }) {
  const style = { "--editable-line-columns": `var(--line-index-width) ${columns.map(column => column.size ?? "minmax(0,1fr)").join(" ")} var(--line-action-width)` } as CSSProperties;
  return <div className="editable-lines" data-ui="editable-lines" style={style}>
    <div aria-hidden="true" className="editable-lines__columns"><span>#</span>{columns.map(column => <span key={column.key}>{column.label}</span>)}<span /></div>
    {children}
  </div>;
}

export function EditableLine({ index, label, children, actions, details, meta }: { index: number; label: string; children: ReactNode; actions?: ReactNode; details?: ReactNode; meta?: ReactNode }) {
  return <article aria-label={`Dòng ${index}: ${label}`} className="editable-line" data-ui="editable-line">
    <div className="editable-line__row"><span className="editable-line__index">{String(index).padStart(2, "0")}</span>{children}<div className="editable-line__actions">{actions}</div></div>
    {meta ? <div className="editable-line__meta">{meta}</div> : null}
    {details ? <details className="editable-line__details"><summary>Chi tiết dòng hàng<ChevronDown aria-hidden="true" size={14} /></summary><div>{details}</div></details> : null}
  </article>;
}

export function OperationalSection({ children, className, title, meta }: { children: ReactNode; className?: string; title: string; meta?: ReactNode }) {
  return (
    <section className={cn("operational-section", className)}>
      <header className="operational-section__header">
        <h2>{title}</h2>
        {meta ? <div className="operational-section__meta">{meta}</div> : null}
      </header>
      <div className="operational-section__body">{children}</div>
    </section>
  );
}
