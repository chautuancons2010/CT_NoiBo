import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAccountsTable } from "@/features/settings/components/UserAccountsTable";
import { SettingsShell } from "@/features/settings/components/SettingsShell";
import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { listAccounts } from "@/features/employees/services/employeeService";

export async function UserAccountsPage() {
  const accounts = listAccounts(await getEmployeeDataSetAsync());

  return (
    <SettingsShell activePath="/settings/users">
      <div className="page-stack">
        <PageHeader
          title="Nguoi dung"
        />
        <UserAccountsTable accounts={accounts} />
        <Card>
          <h2 className="section-title">Dang nhap thong nhat</h2>
          <ul className="foundation-list">
            <li>
              <span>
                <strong>Email, so dien thoai, ma nhan vien</strong>
              </span>
              <StatusBadge tone="info">Resolver layer</StatusBadge>
            </li>
            <li>
              <span>
                <strong>Disable khong xoa ho so</strong>
              </span>
              <StatusBadge tone="success">Da tach</StatusBadge>
            </li>
          </ul>
        </Card>
      </div>
    </SettingsShell>
  );
}
