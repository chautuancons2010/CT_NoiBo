import Link from "next/link";

import styles from "./PackageWorkspace.module.css";

const workspaceSections = [
  { value: "progress", label: "Thi công" },
  { value: "team", label: "Chấm công" },
  { value: "profile", label: "Hồ sơ" },
  { value: "documents", label: "Tài liệu" }
] as const;

export type PackageWorkspaceSection = (typeof workspaceSections)[number]["value"];

export function WorkspaceNav({ projectId, section, visibleSections }: { projectId: string; section: string; visibleSections: readonly PackageWorkspaceSection[] }) {
  return (
    <nav aria-label="Không gian làm việc gói" className={styles.workspaceNav}>
      {workspaceSections.filter((item) => visibleSections.includes(item.value)).map((item) => (
        <Link
          aria-current={item.value === section ? "page" : undefined}
          className={styles.workspaceNavItem}
          data-active={item.value === section || undefined}
          href={`/projects/${projectId}/${item.value}`}
          key={item.value}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
