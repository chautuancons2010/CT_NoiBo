import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2;
}

export function FormSection({ title, description, children, columns = 2 }: FormSectionProps) {
  return (
    <section className="form-section">
      <div className="form-section__header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className={cn("form-section__grid", columns === 1 && "form-section__grid--one")}>
        {children}
      </div>
    </section>
  );
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return <div className="sticky-action-bar">{children}</div>;
}
