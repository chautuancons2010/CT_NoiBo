import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SettingsShell } from "@/features/settings/components/SettingsShell";
import { PermissionDeniedState } from "@/components/shared/States";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { getPermissionGroups } from "@/services/authorization/rbacService";

export async function PermissionCatalogPage() {
  const user = await getRequestUser();
  if (!user || !can(user.permissions, "permission.view")) return <PermissionDeniedState />;
  const groups = getPermissionGroups();

  return (
    <SettingsShell activePath="/settings/permissions">
      <div className="page-stack">
        <PageHeader
          title="Phân quyền"
        />
        <div className="permission-group-grid">
          {groups.map((group) => (
            <Card className="permission-group" key={group.group}>
              <h2 className="section-title">{group.group}</h2>
              <ul>
                {group.permissions.map((permission) => (
                  <li key={permission.key}>
                    <span>
                      <strong>{permission.label}</strong>
                    </span>
                    {permission.sensitive ? <StatusBadge tone="warning">Nhạy cảm</StatusBadge> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </SettingsShell>
  );
}
