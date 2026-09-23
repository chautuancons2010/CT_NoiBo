import type { ReactNode } from "react";

import { PageActionBar } from "@/components/shared/ActionBars";

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, eyebrow, meta, action }: PageHeaderProps) {
  return (
    <header className="page-header page-header--workspace">
      <div className="page-header__copy">
        {eyebrow ? <span className="page-header__eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {meta ? <div className="page-header__meta">{meta}</div> : null}
      </div>
      {action ? <PageActionBar>{action}</PageActionBar> : null}
    </header>
  );
}
