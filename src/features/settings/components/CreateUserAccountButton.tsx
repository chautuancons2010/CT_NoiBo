"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { Input, PasswordInput, Select } from "@/components/shared/FormControls";
import { Modal } from "@/components/shared/Overlays";
import { ACCOUNT_PASSWORD_HTML_PATTERN, ACCOUNT_PASSWORD_MIN_LENGTH } from "@/lib/auth/passwordPolicy";
import type { RoleDefinition } from "@/services/authorization/rbacService";

interface EmployeeChoice {
  id: string;
  employeeCode: string;
  name: string;
}

function suggestedUsername(employeeCode?: string) {
  const normalized = (employeeCode ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return /^[a-z]/.test(normalized) ? normalized.slice(0, 32) : `nv.${normalized}`.slice(0, 32);
}

export function CreateUserAccountButton({ employees, roles }: { employees: EmployeeChoice[]; roles: RoleDefinition[] }) {
  const router = useRouter();
  const defaultRoleId = roles.find((role) => role.code === "employee")?.id ?? roles[0]?.id;
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(defaultRoleId ? [defaultRoleId] : []);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const employee = useMemo(() => employees.find((item) => item.id === employeeId), [employeeId, employees]);

  function toggleRole(roleId: string) {
    setSelectedRoleIds((current) => current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]);
  }

  function close() {
    if (submitting) return;
    setOpen(false);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employeeId || !selectedRoleIds.length) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirmPassword") ?? "")) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/employees/${employeeId}/accounts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: String(form.get("username") ?? "").trim().toLowerCase(),
          password,
          roleIds: selectedRoleIds
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể tạo tài khoản.");
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo tài khoản.");
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <Button disabled={!employees.length || !roles.length} leftIcon={<Plus aria-hidden="true" size={16} />} onClick={() => setOpen(true)} variant="primary">Tạo tài khoản</Button>
    <Modal onClose={close} open={open} title="Tạo tài khoản người dùng">
      <form className="overlay-form" onSubmit={submit}>
        <Select label="Nhân viên" name="employeeId" onChange={(event) => setEmployeeId(event.target.value)} options={employees.map((item) => ({ value: item.id, label: `${item.employeeCode} · ${item.name}` }))} placeholder="Chọn nhân viên chưa có tài khoản" required value={employeeId} />
        <Input autoCapitalize="none" autoComplete="username" defaultValue={suggestedUsername(employee?.employeeCode)} key={`username-${employeeId}`} label="Tên tài khoản" maxLength={32} minLength={3} name="username" pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required />
        <PasswordInput autoComplete="new-password" label="Mật khẩu ban đầu" minLength={ACCOUNT_PASSWORD_MIN_LENGTH} name="password" pattern={ACCOUNT_PASSWORD_HTML_PATTERN} required />
        <PasswordInput autoComplete="new-password" label="Nhập lại mật khẩu" minLength={ACCOUNT_PASSWORD_MIN_LENGTH} name="confirmPassword" pattern={ACCOUNT_PASSWORD_HTML_PATTERN} required />
        <fieldset className="role-choice-list">
          <legend>Vai trò</legend>
          {roles.map((role) => <label key={role.id}><input checked={selectedRoleIds.includes(role.id)} onChange={() => toggleRole(role.id)} type="checkbox" /><span>{role.name}</span></label>)}
        </fieldset>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <footer><Button onClick={close}>Hủy</Button><Button disabled={submitting || !employeeId || !selectedRoleIds.length} type="submit" variant="primary">{submitting ? "Đang tạo…" : "Tạo tài khoản"}</Button></footer>
      </form>
    </Modal>
  </>;
}
