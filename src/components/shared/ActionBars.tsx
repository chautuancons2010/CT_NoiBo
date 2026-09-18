"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button, type ButtonProps } from "@/components/shared/Button";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { cn } from "@/lib/utils/cn";

interface ActionBarProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

function ActionBar({ children, className, label }: ActionBarProps) {
  return (
    <div aria-label={label} className={cn("action-bar", className)} role="toolbar">
      {children}
    </div>
  );
}

export function PageActionBar({ children, className, label = "Thao tác trang" }: ActionBarProps) {
  return <ActionBar className={cn("page-action-bar", className)} label={label}>{children}</ActionBar>;
}

export function TableActionBar({ children, className, label = "Thao tác dữ liệu" }: ActionBarProps) {
  return <ActionBar className={cn("table-action-bar", className)} label={label}>{children}</ActionBar>;
}

export interface ActionButtonProps extends ButtonProps {
  priority?: "primary" | "secondary";
}

export function ActionButton({ className, priority = "secondary", variant, ...props }: ActionButtonProps) {
  return (
    <Button
      className={cn("action-button", `action-button--${priority}`, className)}
      variant={variant ?? (priority === "primary" ? "primary" : "secondary")}
      {...props}
    />
  );
}

interface CompactActionMenuProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function CompactActionMenu({ children, label = "Thao tác khác", className }: CompactActionMenuProps) {
  return (
    <div className={cn("compact-action-menu", className)}>
      <DropdownMenu
        label={label}
        trigger={
          <span aria-hidden="true" className="compact-action-menu__trigger">
            <MoreHorizontal aria-hidden="true" size={18} />
          </span>
        }
      >
        {children}
      </DropdownMenu>
    </div>
  );
}
