import { ClipboardCheck, FileText, HardHat, UsersRound } from "lucide-react";
import Link from "next/link";

import styles from "./PackageWorkspace.module.css";

const workspaceSections = [
  { value: "progress", label: "Điều hành", Icon: HardHat },
  { value: "team", label: "Nhân lực", Icon: UsersRound },
  { value: "profile", label: "Hồ sơ", Icon: ClipboardCheck },
  { value: "documents", label: "Tài liệu", Icon: FileText }
] as const;

export type PackageWorkspaceSection = (typeof workspaceSections)[number]["value"];

export function WorkspaceNav({ projectId, section, visibleSections }: { projectId: string; section: string; visibleSections: readonly PackageWorkspaceSection[] }) {
  return (
    <nav aria-label="Không gian làm việc gói" className={styles.workspaceNav}>
      {workspaceSections.filter((item) => visibleSections.includes(item.value)).map(({ value, label, Icon }) => (
        <Link
          aria-current={value === section ? "page" : undefined}
          className={styles.workspaceNavItem}
          data-active={value === section || undefined}
          href={`/projects/${projectId}/${value}`}
          key={value}
        >
          <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
