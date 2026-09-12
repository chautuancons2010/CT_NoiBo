import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AdminPage } from "@/features/system-admin/components/AdminPage";

const controls = ["Phân quyền route phía server", "Phân quyền API phía server", "Schema cấu hình whitelist", "Kiểm tra MIME tài sản thương hiệu", "Audit thay đổi cấu hình"];

export function SecurityPage() {
  return <AdminPage title="Bảo mật"><section className="settings-form-card security-status-grid">{controls.map((control) => <div key={control}><ShieldCheck aria-hidden="true" size={18} /><strong>{control}</strong><StatusBadge tone="success">Đang bật</StatusBadge></div>)}</section></AdminPage>;
}
