"use client";

import { Children, isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { TableActionBar } from "@/components/shared/ActionBars";
import { Button, IconButton } from "@/components/shared/Button";
import { SearchInput } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { cn } from "@/lib/utils/cn";

export interface FilterBarProps {
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  label?: string;
}

export function FilterBar({ children, actions, className, label = "Bộ lọc dữ liệu" }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const controls = Children.toArray(children);
  const searchIndex = controls.findIndex((child) => isValidElement(child) && child.type === SearchInput);
  const search = searchIndex >= 0 ? controls[searchIndex] : null;
  const filters = controls.filter((_, index) => index !== searchIndex);
  const activeCount = useMemo(() => filters.filter((child) => {
    if (!isValidElement<{ value?: unknown; checked?: unknown }>(child)) return false;
    const value = child.props.value;
    return child.props.checked === true || (value !== undefined && value !== null && String(value).length > 0);
  }).length, [filters]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <section aria-label={label} className={cn("filter-bar", "filter-bar--workspace", className)}>
      {!mobile ? <div className="filter-bar__desktop">
        <div className="filter-bar__controls">{children}</div>
        {actions ? <TableActionBar className="filter-bar__actions">{actions}</TableActionBar> : null}
      </div> : <div className="mobile-filter-bar">
        <div className="mobile-filter-bar__primary">
          {search}
          {filters.length ? (
            <Button
              aria-expanded={open}
              leftIcon={<SlidersHorizontal aria-hidden="true" size={16} />}
              onClick={() => setOpen(true)}
              type="button"
              variant="secondary"
            >
              Bộ lọc{activeCount ? ` (${activeCount})` : ""}
            </Button>
          ) : null}
        </div>
        {actions ? <TableActionBar className="mobile-filter-bar__actions">{actions}</TableActionBar> : null}
      </div>}
      {mobile ? (
        <Drawer onClose={() => setOpen(false)} open={open} title="Bộ lọc">
          <div className="mobile-filter-sheet">{filters}</div>
        </Drawer>
      ) : null}
    </section>
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
