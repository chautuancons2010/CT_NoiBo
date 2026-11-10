"use client";

import { LayoutGrid } from "lucide-react";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { ModuleLauncher } from "@/components/shared/ModuleLauncher";

export function ApplicationMenu() {
  return <DropdownMenu label="Mở Ứng dụng của tôi" menuWidth={480} trigger={<span className="app-header__applications-trigger" title="Ứng dụng"><LayoutGrid aria-hidden="true" size={19} /></span>}>
    <ModuleLauncher layout="menu" showHeading={false} />
  </DropdownMenu>;
}
