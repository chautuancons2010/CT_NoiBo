"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export interface DropdownMenuProps {
  label?: string;
  trigger?: ReactNode;
  children: ReactNode;
}

export function DropdownMenu({ label = "Mở menu", trigger, children }: DropdownMenuProps) {
  return (
    <details className="dropdown">
      <summary aria-label={label}>
        {trigger ?? <MoreHorizontal aria-hidden="true" size={18} />}
      </summary>
      <div className="dropdown__content">{children}</div>
    </details>
  );
}
