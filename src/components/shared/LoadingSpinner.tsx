"use client";

import { LoaderCircle } from "lucide-react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import styles from "./LoadingSpinner.module.css";

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Shared loading indicator for route and data loading states. */
export function LoadingSpinner({ inline = false }: { inline?: boolean } = {}) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (inline) {
    return <LoaderCircle aria-hidden="true" className={`${styles.icon} ${styles.inline}`} size={18} strokeWidth={2.5} />;
  }
  const spinner = (
    <div aria-hidden="true" className={styles.position} data-ui="loading-spinner">
      <div className={styles.surface}>
        <LoaderCircle className={styles.icon} size={32} strokeWidth={2.5} />
      </div>
    </div>
  );
  // Keep the CSS animation visible in streamed HTML before hydration; once
  // mounted, move it outside any transformed ancestors to preserve centering.
  return mounted ? createPortal(spinner, document.body) : spinner;
}
