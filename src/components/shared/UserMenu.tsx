"use client";

import { LogOut, Settings, UserRound } from "lucide-react";

import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { Avatar } from "@/components/shared/Avatar";
import { DropdownMenu } from "@/components/shared/DropdownMenu";

export function UserMenu({ user }: { user: AuthenticatedUser }) {
  return (
    <DropdownMenu
      label="Mở menu người dùng"
      trigger={
        <span className="user-menu__trigger">
          <Avatar name={user.displayName} />
          <span>{user.displayName}</span>
        </span>
      }
    >
      <div className="user-menu__content">
        <p>
          <strong>{user.displayName}</strong>
          <span>{user.email}</span>
        </p>
        <a href="/profile">
          <UserRound aria-hidden="true" size={16} />
          Hồ sơ cá nhân
        </a>
        <a href="/settings/users">
          <Settings aria-hidden="true" size={16} />
          Thiết lập tài khoản
        </a>
        <button type="button">
          <LogOut aria-hidden="true" size={16} />
          Đăng xuất
        </button>
      </div>
    </DropdownMenu>
  );
}
