"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { Input, PasswordInput } from "@/components/shared/FormControls";
import { ConfirmDialog, Modal } from "@/components/shared/Overlays";
import type { Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { ACCOUNT_PASSWORD_HTML_PATTERN, ACCOUNT_PASSWORD_MIN_LENGTH } from "@/lib/auth/passwordPolicy";
import type { EmployeeAccountView } from "@/features/employees/types";
import type { RoleDefinition } from "@/services/authorization/rbacService";

interface EmployeeAccountActionsProps {
  employeeId: string;
  usernameSuggestion?: string;
  account?: EmployeeAccountView;
  permissions: readonly Permission[];
  roles: RoleDefinition[];
}

export function EmployeeAccountActions({
  employeeId,
  usernameSuggestion,
  account: initialAccount,
  permissions,
  roles
}: EmployeeAccountActionsProps) {
  const router = useRouter();
  const [account, setAccount] = useState(initialAccount);
  const [mode, setMode] = useState<"provision" | "roles" | "status" | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialAccount?.roleIds ?? ["role-employee"]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusReason, setStatusReason] = useState("");

  function toggleRole(roleId: string) {
    setSelectedRoleIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]
    );
  }

  async function submitJson(url: string, method: "POST" | "PATCH", payload: unknown) {
    setSubmitting(true);
    setError(null);
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    setSubmitting(false);

    if (!body.ok) {
      setError(body.error?.message ?? "Không thể cập nhật tài khoản.");
      return null;
    }

    return body.data.account as EmployeeAccountView;
  }

  async function handleProvision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    if (password !== String(formData.get("confirmPassword") ?? "")) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    const updatedAccount = await submitJson(`/api/v1/employees/${employeeId}/accounts`, "POST", {
      username: String(formData.get("username") ?? "").trim().toLowerCase(),
      password,
      loginPhone: String(formData.get("loginPhone") ?? "").trim() || undefined,
      roleIds: selectedRoleIds
    });
    if (updatedAccount) {
      setAccount(updatedAccount);
      setMode(null);
      router.refresh();
    }
  }

  async function handleRoles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    const updatedAccount = await submitJson(`/api/v1/accounts/${account.id}/roles`, "PATCH", {
      roleIds: selectedRoleIds
    });
    if (updatedAccount) {
      setAccount(updatedAccount);
      setMode(null);
      router.refresh();
    }
  }

  async function handleStatusChange() {
    if (!account) return;
    const nextStatus = account.status === "active" ? "disabled" : "active";
    const updatedAccount = await submitJson(`/api/v1/accounts/${account.id}/status`, "PATCH", {
      status: nextStatus,
      reason: nextStatus === "disabled" ? statusReason : undefined
    });
    if (updatedAccount) {
      setAccount(updatedAccount);
      setMode(null);
      router.refresh();
    }
  }

  const roleChoices = (
    <fieldset className="role-choice-list">
      <legend>Vai trò</legend>
      {roles.map((role) => (
        <label key={role.id}>
          <input
            checked={selectedRoleIds.includes(role.id)}
            onChange={() => toggleRole(role.id)}
            type="checkbox"
          />
          <span>{role.name}</span>
        </label>
      ))}
    </fieldset>
  );

  return (
    <>
      <div className="account-action-row">
        {!account && can(permissions, "account.create") ? (
          <Button onClick={() => setMode("provision")} variant="primary">
            Cấp tài khoản hệ thống
          </Button>
        ) : null}
        {account && can(permissions, "account.assign_role") ? (
          <Button
            onClick={() => {
              setSelectedRoleIds(account.roleIds);
              setMode("roles");
            }}
          >
            Quản lý vai trò
          </Button>
        ) : null}
        {account && account.status === "active" && can(permissions, "account.disable") ? (
          <Button onClick={() => setMode("status")} variant="danger">
            Vô hiệu hóa
          </Button>
        ) : null}
        {account && account.status !== "active" && can(permissions, "account.enable") ? (
          <Button onClick={() => setMode("status")} variant="primary">
            Kích hoạt
          </Button>
        ) : null}
      </div>

      <Modal open={mode === "provision"} title="Cấp tài khoản" onClose={() => setMode(null)}>
        <form className="overlay-form" onSubmit={handleProvision}>
          {error ? <div className="form-alert form-alert--error">{error}</div> : null}
          <Input autoCapitalize="none" autoComplete="username" defaultValue={usernameSuggestion?.toLowerCase()} label="Tên tài khoản" maxLength={32} minLength={3} name="username" pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required />
          <PasswordInput autoComplete="new-password" label="Mật khẩu ban đầu" minLength={ACCOUNT_PASSWORD_MIN_LENGTH} name="password" pattern={ACCOUNT_PASSWORD_HTML_PATTERN} required />
          <PasswordInput autoComplete="new-password" label="Nhập lại mật khẩu" minLength={ACCOUNT_PASSWORD_MIN_LENGTH} name="confirmPassword" pattern={ACCOUNT_PASSWORD_HTML_PATTERN} required />
          <Input label="Số điện thoại đăng nhập" name="loginPhone" />
          {roleChoices}
          <footer>
            <Button onClick={() => setMode(null)}>Hủy</Button>
            <Button disabled={submitting || selectedRoleIds.length === 0} type="submit" variant="primary">
              {submitting ? "Đang cấp" : "Cấp tài khoản"}
            </Button>
          </footer>
        </form>
      </Modal>

      <Modal open={mode === "roles"} title="Quản lý vai trò" onClose={() => setMode(null)}>
        <form className="overlay-form" onSubmit={handleRoles}>
          {error ? <div className="form-alert form-alert--error">{error}</div> : null}
          {roleChoices}
          <footer>
            <Button onClick={() => setMode(null)}>Hủy</Button>
            <Button disabled={submitting || selectedRoleIds.length === 0} type="submit" variant="primary">
              {submitting ? "Đang lưu" : "Lưu vai trò"}
            </Button>
          </footer>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel={account?.status === "active" ? "Vô hiệu hóa" : "Kích hoạt"}
        danger={account?.status === "active"}
        open={mode === "status"}
        title={account?.status === "active" ? "Vô hiệu hóa tài khoản" : "Kích hoạt tài khoản"}
        onClose={() => setMode(null)}
        onConfirm={handleStatusChange}
      >
        {error ? <div className="form-alert form-alert--error">{error}</div> : null}
        {account?.status === "active" ? (
          <Input
            label="Lý do"
            minLength={3}
            onChange={(event) => setStatusReason(event.target.value)}
            required
            value={statusReason}
          />
        ) : (
          <p>Xác nhận kích hoạt lại tài khoản.</p>
        )}
      </ConfirmDialog>
    </>
  );
}
