import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface TabItem {
  label: string;
  mobileLabel?: string;
  icon?: ReactNode;
  href?: string;
  onSelect?: () => void;
  active?: boolean;
  className?: string;
}

export interface TabsProps {
  items: TabItem[];
  label: string;
  tone?: "mint" | "cyan" | "lavender" | "amber";
  className?: string;
}

export function ContextTabs({ items, label, tone, className }: TabsProps) {
  return (
    <nav aria-label={label} className={cn("tabs", "context-tabs", tone && `tabs--${tone}`, className)}>
      <div className="context-tabs__scroller">
        {items.map((item) => {
          const content = <>
            {item.icon ? <span className="tabs__icon">{item.icon}</span> : null}
            <span className="tabs__label">{item.label}</span>
            {item.mobileLabel ? <span className="tabs__label tabs__label--mobile">{item.mobileLabel}</span> : null}
          </>;
          const sharedProps = {
            "aria-current": item.active ? "page" as const : undefined,
            className: cn("tabs__item", item.className, item.active && "is-active"),
            "data-active": item.active || undefined
          };

          return item.onSelect ? (
            <button {...sharedProps} key={item.href ?? item.label} onClick={item.onSelect} type="button">{content}</button>
          ) : (
            <Link {...sharedProps} href={item.href ?? "#"} key={item.href ?? item.label}>{content}</Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Backwards-compatible name while feature pages move to ContextTabs. */
export function Tabs(props: TabsProps) {
  return <ContextTabs {...props} />;
}
