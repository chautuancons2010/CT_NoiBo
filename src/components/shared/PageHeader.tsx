import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__copy">
        <h1>{title}</h1>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
