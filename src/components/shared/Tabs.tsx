import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export interface TabItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  label: string;
}

export function Tabs({ items, label }: TabsProps) {
  return (
    <nav aria-label={label} className="tabs">
      {items.map((item) => (
        <Link className={cn("tabs__item", item.active && "is-active")} href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
