import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SettingsShell } from "@/features/settings/components/SettingsShell";
import { getPermissionGroups } from "@/services/authorization/rbacService";

export function PermissionCatalogPage() {
  const groups = getPermissionGroups();

  return (
    <SettingsShell activePath="/settings/permissions">
      <div className="page-stack">
        <PageHeader
          title="Phan quyen"
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
                      <code>{permission.key}</code>
                    </span>
                    {permission.sensitive ? <StatusBadge tone="warning">Nhay cam</StatusBadge> : null}
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
