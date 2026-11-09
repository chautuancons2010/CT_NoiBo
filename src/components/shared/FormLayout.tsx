import type { FormHTMLAttributes, HTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils/cn";

export function SectionedForm({ children, className, ...props }: FormHTMLAttributes<HTMLFormElement> & { ref?: Ref<HTMLFormElement> }) {
  return <form {...props} className={cn("sectioned-form", className)} data-ui="sectioned-form">{children}</form>;
}

export function FormFields({ children }: { children: ReactNode }) {
  return <div className="form-fields" data-ui="form-fields">{children}</div>;
}

export function InlineForm({ children, className, ...props }: FormHTMLAttributes<HTMLFormElement> & { ref?: Ref<HTMLFormElement> }) {
  return <form {...props} className={cn("inline-form", className)} data-ui="inline-form">{children}</form>;
}

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2;
}

export function FormSection({ title, children, columns = 2 }: FormSectionProps) {
  return (
    <section className="form-section">
      <div className="form-section__header">
        <h2>{title}</h2>
      </div>
      <div className={cn("form-section__grid", columns === 1 && "form-section__grid--one")}>
        {children}
      </div>
    </section>
  );
}

/** Canonical field grouping name for new and migrated feature forms. */
export function FormWorkspace({children,aside}:{children:ReactNode;aside:ReactNode}) {
  return <div className="form-workspace"><div className="form-workspace__main">{children}</div><div className="form-workspace__aside">{aside}</div></div>;
}

/** Canonical field grouping name for new and migrated feature forms. */
export function FieldGroup(props: FormSectionProps) {
  return <FormSection {...props} />;
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return <div className="sticky-action-bar">{children}</div>;
}

export function FormActions({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return <footer {...props} className={cn("form-actions", className)}>{children}</footer>;
}

export interface FormErrorSummaryItem {
  fieldId: string;
  message: string;
}

export function FormErrorSummary({
  errors,
  title = "Vui lòng kiểm tra thông tin"
}: {
  errors: FormErrorSummaryItem[];
  title?: string;
}) {
  if (errors.length === 0) return null;

  return (
    <section aria-label={title} className="form-error-summary" role="alert" tabIndex={-1}>
      <strong>{title}</strong>
      <ul>
        {errors.map((error) => (
          <li key={`${error.fieldId}-${error.message}`}>
            <a href={`#${error.fieldId}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
