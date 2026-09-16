import { ShieldCheck } from "lucide-react";

import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionDeniedState } from "@/components/shared/States";
import { RoleTable } from "@/features/settings/components/RoleTable";
import { SettingsShell } from "@/features/settings/components/SettingsShell";
import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { getPermissionGroups } from "@/services/authorization/rbacService";
import { getRolesFromRepository } from "@/services/authorization/roleRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { can } from "@/lib/auth/permissions";

export async function RoleManagementPage() {
  const user = await getRequestUser();
  if (!user || !can(user.permissions, "role.view")) return <PermissionDeniedState />;
  const dataSet = await getEmployeeDataSetAsync();
  const roles = getRolesFromRepository(
    dataSet.accounts.map((account) => ({
      accountId: account.id,
      status: account.status,
      roleIds: account.roleIds
    }))
  );
  const permissionGroups = getPermissionGroups();

  return (
    <SettingsShell activePath="/settings/roles">
      <div className="page-stack">
        <PageHeader
          title="Vai trò"
        />
        <RoleTable canManage={can(user.permissions, "role.manage")} permissionGroups={permissionGroups} roles={roles} />
        <Card>
          <header className="panel-header">
            <div>
              <h2>Ma trận quyền</h2>
            </div>
            <StatusBadge tone="success">
              <ShieldCheck aria-hidden="true" size={14} />
              Tổng hợp quyền
            </StatusBadge>
          </header>
          <div className="permission-group-grid">
            {permissionGroups.map((group) => (
              <section className="permission-group" key={group.group}>
                <h3>{group.group}</h3>
                <ul>
                  {group.permissions.slice(0, 7).map((permission) => (
                    <li key={permission.key}>
                      <span>
                        <strong>{permission.label}</strong>
                      </span>
                      {permission.sensitive ? <StatusBadge tone="warning">Nhạy cảm</StatusBadge> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>
      </div>
    </SettingsShell>
  );
}
