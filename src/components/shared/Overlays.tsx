"use client";

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import { Button, IconButton } from "@/components/shared/Button";
import { cn } from "@/lib/utils/cn";

interface OverlayProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

function useOverlay(open: boolean, onClose: () => void): RefObject<HTMLElement | null> {
  const overlayRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlayRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  return overlayRef;
}

function keepFocusInside(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector));
  if (focusable.length === 0) {
    event.preventDefault();
    event.currentTarget.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function Modal({ open, title, children, onClose }: OverlayProps) {
  const dialogRef = useOverlay(open, onClose);
  const titleId = useId();

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation">
      <section aria-labelledby={titleId} aria-modal="true" className="modal" onKeyDown={keepFocusInside} ref={dialogRef} role="dialog" tabIndex={-1}>
        <header className="overlay__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Đóng" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Drawer({ open, title, children, onClose }: OverlayProps) {
  const drawerRef = useOverlay(open, onClose);
  const titleId = useId();

  if (!open) {
    return null;
  }

  return (
    <div className="overlay overlay--drawer" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation">
      <aside aria-labelledby={titleId} aria-modal="true" className="drawer" onKeyDown={keepFocusInside} ref={drawerRef} role="dialog" tabIndex={-1}>
        <header className="overlay__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Đóng" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </IconButton>
        </header>
        {children}
      </aside>
    </div>
  );
}

export interface ConfirmDialogProps extends OverlayProps {
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Xác nhận",
  danger,
  onClose,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="confirm-dialog">
        <div>{children}</div>
        <footer>
          <Button onClick={onClose} variant="secondary">
            Hủy
          </Button>
          <Button onClick={onConfirm} variant={danger ? "danger" : "primary"}>
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

export interface LightboxProps extends OverlayProps {
  mediaClassName?: string;
}

export function Lightbox({ open, title, children, onClose, mediaClassName }: LightboxProps) {
  const lightboxRef = useOverlay(open, onClose);
  const titleId = useId();

  if (!open) {
    return null;
  }

  return (
    <div className="overlay overlay--lightbox" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation">
      <section aria-labelledby={titleId} aria-modal="true" className="lightbox" onKeyDown={keepFocusInside} ref={lightboxRef} role="dialog" tabIndex={-1}>
        <header className="overlay__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Đóng" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </IconButton>
        </header>
        <div className={cn("lightbox__media", mediaClassName)}>{children}</div>
      </section>
    </div>
  );
}
