import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAccountsTable } from "@/features/settings/components/UserAccountsTable";
import { SettingsShell } from "@/features/settings/components/SettingsShell";
import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { listAccounts } from "@/features/employees/services/employeeService";
import { PermissionDeniedState } from "@/components/shared/States";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { can } from "@/lib/auth/permissions";

export async function UserAccountsPage() {
  const user = await getRequestUser();
  if (!user || !can(user.permissions, "user.view")) return <PermissionDeniedState />;
  const accounts = listAccounts(await getEmployeeDataSetAsync());

  return (
    <SettingsShell activePath="/settings/users">
      <div className="page-stack">
        <PageHeader
          title="Người dùng"
        />
        <UserAccountsTable accounts={accounts} />
        <Card>
          <h2 className="section-title">Đăng nhập thống nhất</h2>
          <ul className="foundation-list">
            <li>
              <span>
                <strong>Email, số điện thoại, mã nhân viên</strong>
              </span>
              <StatusBadge tone="info">Lớp phân giải</StatusBadge>
            </li>
            <li>
              <span>
                <strong>Vô hiệu hóa không xóa hồ sơ</strong>
              </span>
              <StatusBadge tone="success">Đã tách</StatusBadge>
            </li>
          </ul>
        </Card>
      </div>
    </SettingsShell>
  );
}
