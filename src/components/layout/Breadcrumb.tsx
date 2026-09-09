import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { BreadcrumbItem } from "@/config/routeRegistry";

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {item.href && !isLast ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
              {!isLast ? <ChevronRight aria-hidden="true" size={14} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
