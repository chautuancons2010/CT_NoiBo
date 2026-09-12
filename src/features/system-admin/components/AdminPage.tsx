import type { ReactNode } from "react";

export function AdminPage({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="page-stack admin-page">
      <div className="page-header">
        <div className="page-header__copy"><h2>{title}</h2></div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
