"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";

import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { visibleQuickActions } from "@/features/dashboard/registry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

export function QuickCreateMenu({ user }: { user: AuthenticatedUser }) {
  const actions = visibleQuickActions(user);
  if (!actions.length) return null;

  return (
    <div className="quick-create">
      <DropdownMenu
        label="Tạo mới"
        trigger={<span className="quick-create__trigger"><Plus aria-hidden="true" size={17} /><span>Tạo mới</span><ChevronDown aria-hidden="true" size={14} /></span>}
      >
        <div className="quick-create__menu">
          {actions.map((action) => <Link href={action.href} key={action.key}>{action.label}</Link>)}
        </div>
      </DropdownMenu>
    </div>
  );
}
