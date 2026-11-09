"use client";

import { LayoutGrid } from "lucide-react";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { ModuleLauncher } from "@/components/shared/ModuleLauncher";

export function ApplicationMenu() {
  return <DropdownMenu label="Mở danh sách ứng dụng" menuWidth={480} trigger={<span className="app-header__applications-trigger"><LayoutGrid aria-hidden="true" size={19} /><span>Ứng dụng</span></span>}>
    <ModuleLauncher layout="menu" showHeading={false} />
  </DropdownMenu>;
}
