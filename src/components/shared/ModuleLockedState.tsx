import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { moduleLabels, type ModuleKey } from "@/config/systemSettings";
import { attendanceOnlyRelease } from "@/config/featureRelease";

export function ModuleLockedState({ module, canManage }: { module: ModuleKey; canManage: boolean }) {
  return (
    <section className="settings-form-card" aria-label="Module tạm khóa" role="status">
      <LockKeyhole aria-hidden="true" size={32} />
      <h1>{moduleLabels[module]}</h1>
      <span className="status-badge status-badge--warning">Đang tạm khóa</span>
      <h2>Chưa có thông tin</h2><p>Vui lòng quay lại sau.</p>
      <div className="form-actions">
        <Link className="button button--secondary button--md" href="/personal">Về Cá nhân</Link>
        {canManage && !attendanceOnlyRelease ? <Link className="button button--primary button--md" href="/system-admin/modules">Quản lý module</Link> : null}
      </div>
    </section>
  );
}
