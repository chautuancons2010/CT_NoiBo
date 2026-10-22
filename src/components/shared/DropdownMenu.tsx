"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { FloatingPanel } from "@/components/shared/FloatingPanel";

export interface DropdownMenuProps {
  label?: string;
  trigger?: ReactNode;
  children: ReactNode;
}

export function DropdownMenu({ label = "Mở menu", trigger, children }: DropdownMenuProps) {
  const anchor = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const keyboardFocus = useRef<"first" | "last" | undefined>(undefined);
  useLayoutEffect(() => {
    if (!open) return;
    const actions = document.getElementById(id)?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    actions?.forEach((action) => action.setAttribute("role", "menuitem"));
    if (keyboardFocus.current) {
      actions?.[keyboardFocus.current === "last" ? actions.length - 1 : 0]?.focus();
      keyboardFocus.current = undefined;
    }
  }, [id, open]);
  return <span className="dropdown">
    <button aria-controls={open ? id : undefined} aria-expanded={open} aria-haspopup="menu" aria-label={label} className="dropdown__trigger" onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      keyboardFocus.current = event.key === "ArrowUp" ? "last" : "first";
      setOpen(true);
    }} ref={anchor} type="button">{trigger ?? <MoreHorizontal aria-hidden="true" size={18} />}</button>
    {open ? <FloatingPanel anchor={anchor} className="dropdown__content" id={id} label={label} matchWidth={false} onClose={() => setOpen(false)} role="menu">
      <div onClick={(event) => {
        if (!(event.target instanceof Element)) return;
        const action = event.target.closest("a, button");
        if (!action || action.matches(":disabled, [aria-disabled='true']")) return;
        setOpen(false);
        if (action.tagName === "BUTTON") anchor.current?.focus({ preventScroll: true });
      }} onKeyDown={(event) => {
        if (event.key === "Tab") { setOpen(false); return; }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const actions = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href]:not([aria-disabled="true"]), button:not([disabled])'));
        const index = actions.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? actions.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + actions.length) % actions.length;
        actions[next]?.focus();
      }}>{children}</div>
    </FloatingPanel> : null}
  </span>;
}
