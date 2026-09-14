"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <Button disabled={busy} leftIcon={<LogOut aria-hidden="true" size={16} />} onClick={async () => { setBusy(true); try { await fetch("/api/v1/auth/logout", { method: "POST" }); } finally { router.replace("/login"); router.refresh(); } }} variant="secondary">Đăng xuất</Button>;
}
