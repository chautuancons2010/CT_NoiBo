"use client";

import { LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { Avatar } from "@/components/shared/Avatar";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { clearSupabaseRealtimeAuthentication } from "@/lib/supabase/client";

export function UserMenu({ user }: { user: AuthenticatedUser }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      clearSupabaseRealtimeAuthentication();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <DropdownMenu
      label="Mở menu người dùng"
      trigger={
        <span className="user-menu__trigger">
          <Avatar imageUrl="/api/v1/workspace/avatar" name={user.displayName} />
          <span>{user.displayName}</span>
        </span>
      }
    >
      <div className="user-menu__content">
        <p>
          <strong>{user.displayName}</strong>
          <span>@{user.username}</span>
        </p>
        <Link href="/profile">
          <UserRound aria-hidden="true" size={16} />
          Hồ sơ cá nhân
        </Link>
        {can(user.permissions, "user.view") ? <Link href="/settings/users">
          <Settings aria-hidden="true" size={16} />
          Thiết lập tài khoản
        </Link> : null}
        <button disabled={loggingOut} onClick={() => void logout()} type="button">
          <LogOut aria-hidden="true" size={16} />
          {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
      </div>
    </DropdownMenu>
  );
}
