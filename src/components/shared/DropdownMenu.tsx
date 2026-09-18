"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export interface DropdownMenuProps {
  label?: string;
  trigger?: ReactNode;
  children: ReactNode;
}

export function DropdownMenu({ label = "Mở menu", trigger, children }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menuRef.current?.open && event.target instanceof Node && !menuRef.current.contains(event.target)) menuRef.current.open = false;
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, []);
  return (
    <details className="dropdown" ref={menuRef}>
      <summary aria-label={label}>
        {trigger ?? <MoreHorizontal aria-hidden="true" size={18} />}
      </summary>
      <div className="dropdown__content" onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("a") && menuRef.current) menuRef.current.open = false;
      }}>{children}</div>
    </details>
  );
}
