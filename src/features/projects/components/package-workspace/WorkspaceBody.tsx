import type { ReactNode } from "react";

import styles from "./PackageWorkspace.module.css";

export function WorkspaceBody({ children }: { children: ReactNode }) {
  return <div className={styles.workspaceBody} id="package-workspace-body">{children}</div>;
}

