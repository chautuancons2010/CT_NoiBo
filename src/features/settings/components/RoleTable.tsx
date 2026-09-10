"use client";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { RoleDefinition } from "@/services/authorization/rbacService";

const roleColumns: DataTableColumn<RoleDefinition>[] = [
  {
    id: "name",
    header: "Ten vai tro",
    cell: (role) => (
      <span className="employee-name-cell">
        <strong>{role.name}</strong>
      </span>
    )
  },
  {
    id: "userCount",
    header: "Nguoi dung",
    cell: (role) => `${role.userCount} tai khoan`
  },
  {
    id: "permissions",
    header: "Permissions",
    cell: (role) => `${role.permissionKeys.length} quyen`
  },
  {
    id: "type",
    header: "Loai",
    cell: (role) => (
      <StatusBadge tone={role.isSystem ? "info" : "neutral"}>
        {role.isSystem ? "He thong" : "Tuy chinh"}
      </StatusBadge>
    )
  }
];

export function RoleTable({ roles }: { roles: RoleDefinition[] }) {
  return <DataTable columns={roleColumns} data={roles} getRowId={(role) => role.id} />;
}
