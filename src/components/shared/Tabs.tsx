import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export interface TabItem {
  label: string;
  mobileLabel?: string;
  href: string;
  active?: boolean;
  className?: string;
}

export interface TabsProps {
  items: TabItem[];
  label: string;
  tone?: "mint" | "cyan" | "lavender" | "amber";
}

export function Tabs({ items, label, tone }: TabsProps) {
  return (
    <nav aria-label={label} className={cn("tabs", tone && `tabs--${tone}`)}>
      {items.map((item) => (
        <Link className={cn("tabs__item", item.className, item.active && "is-active")} href={item.href} key={item.href}>
          <span className="tabs__label">{item.label}</span>
          {item.mobileLabel ? <span className="tabs__label tabs__label--mobile">{item.mobileLabel}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
