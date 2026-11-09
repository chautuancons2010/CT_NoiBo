"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { getLoadingSnapshot, getServerLoadingSnapshot, subscribeToLoading } from "@/lib/ui/loadingActivity";
import styles from "./LoadingSpinner.module.css";

export function GlobalLoadingIndicator() {
  const pending = useSyncExternalStore(subscribeToLoading, getLoadingSnapshot, getServerLoadingSnapshot);
  const active = pending.page > 0;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(active), active ? 180 : 0);
    return () => clearTimeout(timer);
  }, [active]);
  if (!active || !visible) return null;
  return createPortal(
    <div aria-label="Đang mở trang" aria-live="polite" className={styles.position} data-loading-mode="page" data-ui="loading-progress" role="status">
      <span aria-hidden="true" className={styles.track} />
      <span className="sr-only">Đang mở trang</span>
    </div>,
    document.body
  );
}
