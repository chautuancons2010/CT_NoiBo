"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Button, IconButton } from "@/components/shared/Button";
import { cn } from "@/lib/utils/cn";

interface OverlayProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ open, title, children, onClose }: OverlayProps) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" role="presentation">
      <section aria-modal="true" className="modal" ref={dialogRef} role="dialog" tabIndex={-1}>
        <header className="overlay__header">
          <h2>{title}</h2>
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
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay overlay--drawer" role="presentation">
      <aside aria-modal="true" className="drawer" ref={drawerRef} role="dialog" tabIndex={-1}>
        <header className="overlay__header">
          <h2>{title}</h2>
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
  const lightboxRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement = document.activeElement as HTMLElement | null;
    lightboxRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay overlay--lightbox" role="presentation">
      <section aria-modal="true" className="lightbox" ref={lightboxRef} role="dialog" tabIndex={-1}>
        <header className="overlay__header">
          <h2>{title}</h2>
          <IconButton label="Đóng" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </IconButton>
        </header>
        <div className={cn("lightbox__media", mediaClassName)}>{children}</div>
      </section>
    </div>
  );
}
