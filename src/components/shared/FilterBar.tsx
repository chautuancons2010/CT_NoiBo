"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton } from "@/components/shared/Button";
import { cn } from "@/lib/utils/cn";

export interface FilterBarProps {
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({ children, actions, className }: FilterBarProps) {
  return (
    <div className={cn("filter-bar", className)}>
      <div className="filter-bar__controls">{children}</div>
      {actions ? <div className="filter-bar__actions">{actions}</div> : null}
    </div>
  );
}

export interface FilterChipProps {
  label: string;
  value?: string;
  onRemove?: () => void;
}

export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <span className="filter-chip">
      <span>
        {label}
        {value ? `: ${value}` : null}
      </span>
      {onRemove ? (
        <IconButton label={`Bỏ lọc ${label}`} onClick={onRemove}>
          <X aria-hidden="true" size={14} />
        </IconButton>
      ) : null}
    </span>
  );
}
