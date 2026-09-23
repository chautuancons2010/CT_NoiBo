import Link from "next/link";

import { PageHeader } from "@/components/shared/PageHeader";
import { LeaveRequestList } from "@/features/leave";

const managementLinks = [
  { href: "/leave/manage/balances", label: "Số dư nhân viên" },
  { href: "/leave/manage/adjustments", label: "Điều chỉnh phép" },
  { href: "/settings/leave/types", label: "Loại nghỉ" },
  { href: "/settings/leave/workflows", label: "Quy trình" },
  { href: "/settings/leave/policies", label: "Chính sách" }
];

export default function Page() {
  return (
    <div className="page-stack leave-management-page">
      <PageHeader title="Quản lý nghỉ phép" />
      <nav aria-label="Quản trị nghỉ phép" className="leave-quick-links">
        {managementLinks.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
      <LeaveRequestList scope="all" />
    </div>
  );
}
