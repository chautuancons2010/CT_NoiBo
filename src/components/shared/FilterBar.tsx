"use client";

import { Children, cloneElement, isValidElement, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { TableActionBar } from "@/components/shared/ActionBars";
import { Button, IconButton } from "@/components/shared/Button";
import { SearchInput } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { cn } from "@/lib/utils/cn";
import { useIsPhone } from "@/lib/ui/useIsPhone";

export interface FilterBarProps {
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  label?: string;
  onApply?: () => void;
  onReset?: () => void;
}

export interface FilterSheetProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  onApply?: () => void;
  onReset?: () => void;
  title?: string;
}

export function FilterSheet({ children, open, onClose, onApply, onReset, title = "Bộ lọc" }: FilterSheetProps) {
  return (
    <Drawer className="filter-sheet" keepMounted onClose={onClose} open={open} title={title}>
      <div className="mobile-filter-sheet">{children}</div>
      <footer className="mobile-filter-sheet__actions">
        {onReset ? <Button onClick={onReset} type="button" variant="secondary">Đặt lại</Button> : null}
        <Button onClick={() => { onApply?.(); onClose(); }} type="button" variant="primary">Áp dụng</Button>
      </footer>
    </Drawer>
  );
}

export function FilterBar({ children, actions, className, label = "Bộ lọc dữ liệu", onApply, onReset }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const mobile = useIsPhone();
  const rootRef = useRef<HTMLElement>(null);
  const generatedFormId = useId();
  const [formId, setFormId] = useState<string>();
  useLayoutEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    if (!form.id) form.id = `${generatedFormId}-filters`;
    setFormId(form.id);
  }, [generatedFormId]);
  const controls = Children.toArray(children);
  const searchIndex = controls.findIndex((child) => isValidElement(child) && child.type === SearchInput);
  const search = searchIndex >= 0 ? controls[searchIndex] : null;
  const filters = controls.filter((_, index) => index !== searchIndex);
  const activeCount = useMemo(() => filters.filter((child) => {
    if (!isValidElement<{ value?: unknown; defaultValue?: unknown; checked?: unknown }>(child)) return false;
    const value = child.props.value ?? child.props.defaultValue;
    return child.props.checked === true || (value !== undefined && value !== null && String(value).length > 0);
  }).length, [filters]);

  return (
    <section aria-label={label} className={cn("filter-bar", "filter-bar--workspace", className)} ref={rootRef}>
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
        <FilterSheet onApply={onApply ?? (formId ? () => rootRef.current?.closest("form")?.requestSubmit() : undefined)} onClose={() => setOpen(false)} onReset={onReset ?? (formId ? () => rootRef.current?.closest("form")?.reset() : undefined)} open={open}>{filters.map((filter) => isValidElement<{ form?: string }>(filter) && formId ? cloneElement(filter, { form: formId }) : filter)}</FilterSheet>
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
