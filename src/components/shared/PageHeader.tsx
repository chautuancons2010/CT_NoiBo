import type { ReactNode } from "react";

import { PageActionBar } from "@/components/shared/ActionBars";
import { cn } from "@/lib/utils/cn";

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}

export function ResponsivePageHeader({ title, meta, action }: PageHeaderProps) {
  return (
    <header className="page-header page-header--workspace page-header--compact" data-has-action={action ? "true" : "false"} data-ui="page-header">
      <div className="page-header__copy">
        <h1>{title}</h1>
        {meta ? <div className="page-header__meta">{meta}</div> : null}
      </div>
      {action ? <PageActionBar>{action}</PageActionBar> : null}
    </header>
  );
}

/** Backwards-compatible name while feature pages move to the UI Core contract. */
export function PageHeader(props: PageHeaderProps) {
  return <ResponsivePageHeader {...props} />;
}

export interface RecordHeaderProps {
  title: string;
  avatar?: ReactNode;
  code?: string;
  meta?: ReactNode;
  status?: ReactNode;
  action?: ReactNode;
  navigation?: ReactNode;
}

export function RecordHeader({ title, avatar, code, meta, status, action, navigation }: RecordHeaderProps) {
  return <section className="record-context">
    <header className="page-header record-header" data-has-action={action ? "true" : "false"} data-has-avatar={Boolean(avatar)} data-ui="page-header">
      {avatar ? <div className="record-header__avatar">{avatar}</div> : null}
      <div className="page-header__copy record-header__copy">
        <div className="record-header__title"><h1>{title}</h1>{status}</div>
        {code || meta ? <div className="page-header__meta record-header__meta">{code ? <span className="record-header__code">{code}</span> : null}{meta}</div> : null}
      </div>
      {action ? <div className="record-header__actions"><PageActionBar>{action}</PageActionBar></div> : null}
    </header>
    {navigation}
  </section>;
}

export interface EntityContextHeaderProps {
  title: ReactNode;
  code?: ReactNode;
  meta?: ReactNode;
  back?: ReactNode;
  status?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EntityContextHeader({
  title,
  code,
  meta,
  back,
  status,
  action,
  className
}: EntityContextHeaderProps) {
  return (
    <header className={cn("entity-context-header", className)}>
      {back || status ? (
        <div className="entity-context-header__topline">
          <div>{back}</div>
          <div>{status}</div>
        </div>
      ) : null}
      <div className="entity-context-header__main">
        <div className="entity-context-header__identity">
          {code ? <span className="entity-context-header__code">{code}</span> : null}
          <h1>{title}</h1>
          {meta ? <div className="entity-context-header__meta">{meta}</div> : null}
        </div>
        {action ? <PageActionBar label="Thao tác đối tượng">{action}</PageActionBar> : null}
      </div>
    </header>
  );
}
