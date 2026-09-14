"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/FormControls";

export function LoginForm() {
  const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(""); const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
      const body = await response.json() as { data?: { redirectTo?: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || "Không thể đăng nhập.");
      window.location.assign(body.data?.redirectTo || "/dashboard");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đăng nhập."); setSubmitting(false); }
  }
  return <form onSubmit={submit}><Input autoCapitalize="none" autoComplete="username" label="Tên tài khoản" name="username" pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" required /><Input autoComplete="current-password" label="Mật khẩu" minLength={8} name="password" required type="password" />{error ? <p aria-live="polite" className="form-error" role="alert">{error}</p> : null}<Button disabled={submitting} type="submit" variant="primary">{submitting ? "Đang đăng nhập…" : "Đăng nhập"}</Button></form>;
}
