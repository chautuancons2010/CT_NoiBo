"use client";

import { useRef, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/shared/Button";
import { PasswordInput } from "@/components/shared/FormControls";
import { ACCOUNT_PASSWORD_HTML_PATTERN, ACCOUNT_PASSWORD_MIN_LENGTH } from "@/lib/auth/passwordPolicy";
import { clearSupabaseRealtimeAuthentication } from "@/lib/supabase/client";

export function ChangePasswordForm({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setConfirmationError("");
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setConfirmationError("Mật khẩu nhập lại chưa khớp.");
      event.currentTarget.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/v1/auth/password", {
        method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        setError(body?.error?.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
        return;
      }
      clearSupabaseRealtimeAuthentication();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Mất kết nối. Vui lòng thử lại.");
    } finally {
      clearTimeout(timeout);
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!open) return <Button leftIcon={<KeyRound aria-hidden="true" size={16} />} onClick={() => setOpen(true)} variant="secondary">Đổi mật khẩu</Button>;

  return <form aria-label="Đổi mật khẩu" className="page-stack password-change-form" method="post" onSubmit={submit}>
    <PasswordInput autoComplete="current-password" label="Mật khẩu hiện tại" name="currentPassword" required />
    <PasswordInput autoComplete="new-password" label="Mật khẩu mới" minLength={ACCOUNT_PASSWORD_MIN_LENGTH} name="newPassword" pattern={ACCOUNT_PASSWORD_HTML_PATTERN} required />
    <PasswordInput autoComplete="new-password" error={confirmationError || undefined} label="Nhập lại mật khẩu mới" name="confirmPassword" onChange={() => setConfirmationError("")} required />
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div className="form-actions">
      <Button disabled={busy} onClick={() => { if (initiallyOpen) router.push("/profile"); else setOpen(false); }}>Hủy</Button>
      <Button busy={busy} type="submit" variant="primary">{busy ? "Đang lưu…" : "Lưu mật khẩu"}</Button>
    </div>
  </form>;
}
