"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Input, Textarea } from "@/components/shared/FormControls";
import { Modal } from "@/components/shared/Overlays";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type {
  PermissionDefinition,
  PermissionGroup,
  RoleDefinition
} from "@/services/authorization/rbacService";

type PermissionGroupView = { group: PermissionGroup; permissions: PermissionDefinition[] };

const roleColumns: DataTableColumn<RoleDefinition>[] = [
  { id: "name", header: "Tên vai trò", cell: (role) => <strong>{role.name}</strong> },
  { id: "userCount", header: "Người dùng", cell: (role) => `${role.userCount} tài khoản` },
  { id: "permissions", header: "Quyền", cell: (role) => `${role.permissionKeys.length} quyền` },
  {
    id: "type",
    header: "Loại",
    cell: (role) => (
      <StatusBadge tone={role.isSystem ? "info" : "neutral"}>
        {role.isSystem ? "Hệ thống" : "Tùy chỉnh"}
      </StatusBadge>
    )
  }
];

export function RoleTable({ roles, permissionGroups, canManage }: { roles: RoleDefinition[]; permissionGroups: PermissionGroupView[]; canManage: boolean }) {
  const router = useRouter();
  const [editingRole, setEditingRole] = useState<RoleDefinition | null | "new">(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openEditor(role: RoleDefinition | "new") {
    setEditingRole(role);
    setSelectedPermissions(role === "new" ? [] : role.permissionKeys);
    setError(null);
  }

  function togglePermission(permissionKey: string) {
    setSelectedPermissions((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRole) return;
    setSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const isNew = editingRole === "new";
    const response = await fetch(isNew ? "/api/v1/roles" : `/api/v1/roles/${editingRole.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: currentRole?.isSystem ? undefined : String(formData.get("code") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim() || undefined,
        permissionKeys: selectedPermissions
      })
    });
    const body = await response.json();
    setSubmitting(false);
    if (!body.ok) {
      setError(body.error?.message ?? "Không thể lưu vai trò.");
      return;
    }

    setEditingRole(null);
    router.refresh();
  }

  const currentRole = editingRole === "new" ? undefined : editingRole ?? undefined;

  return (
    <ListPageLayout className="role-manager">
      <DataSurface>
        {canManage ? (
          <div className="data-surface__toolbar action-row">
            <Button onClick={() => openEditor("new")} variant="primary">Thêm vai trò</Button>
          </div>
        ) : null}
        <DataTable
          actions={canManage ? (role) => <DropdownMenu label={`Thao tác ${role.name}`}><button onClick={() => openEditor(role)} type="button">Chỉnh sửa</button></DropdownMenu> : undefined}
          columns={roleColumns}
          data={roles}
          getRowId={(role) => role.id}
        />
      </DataSurface>

      <Modal open={editingRole !== null} title={editingRole === "new" ? "Thêm vai trò" : "Chỉnh sửa vai trò"} onClose={() => setEditingRole(null)}>
        <form className="overlay-form" onSubmit={handleSubmit}>
          {error ? <div className="form-alert form-alert--error">{error}</div> : null}
          <Input defaultValue={currentRole?.code} disabled={Boolean(currentRole?.isSystem)} label="Mã vai trò" name="code" required />
          <Input defaultValue={currentRole?.name} label="Tên vai trò" name="name" required />
          <Textarea defaultValue={currentRole?.description} label="Mô tả" name="description" />
          <div className="permission-editor">
            {permissionGroups.map((group) => (
              <fieldset className="role-choice-list" key={group.group}>
                <legend>{group.group}</legend>
                {group.permissions.map((permission) => (
                  <label key={permission.key}>
                    <input checked={selectedPermissions.includes(permission.key)} onChange={() => togglePermission(permission.key)} type="checkbox" />
                    <span>{permission.label}</span>
                    {permission.sensitive ? <StatusBadge tone="warning">Nhạy cảm</StatusBadge> : null}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <footer>
            <Button onClick={() => setEditingRole(null)}>Hủy</Button>
            <Button disabled={submitting || selectedPermissions.length === 0} type="submit" variant="primary">
              {submitting ? "Đang lưu" : "Lưu vai trò"}
            </Button>
          </footer>
        </form>
      </Modal>
    </ListPageLayout>
  );
}
