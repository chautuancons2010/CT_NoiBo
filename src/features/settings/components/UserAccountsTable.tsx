"use client";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { listAccounts } from "@/features/employees/services/employeeService";

type AccountRow = ReturnType<typeof listAccounts>[number];

const accountColumns: DataTableColumn<AccountRow>[] = [
  {
    id: "displayName",
    header: "Tài khoản",
    cell: (account) => (
      <span className="employee-name-cell">
        <strong>{account.displayName}</strong>
        <small>{account.loginEmail ?? account.loginPhone ?? account.employeeCodeIdentifier}</small>
      </span>
    )
  },
  {
    id: "employee",
    header: "Hồ sơ nhân sự",
    cell: (account) => account.employeeName ?? "Chưa liên kết"
  },
  {
    id: "roles",
    header: "Vai trò",
    cell: (account) => account.roleNames.join(", ")
  },
  {
    id: "effectivePermissions",
    header: "Quyền hiệu lực",
    cell: (account) => `${account.effectivePermissions.length} quyền`
  },
  {
    id: "status",
    header: "Trạng thái",
    cell: (account) => (
      <StatusBadge tone={account.status === "active" ? "success" : "warning"}>
        {account.status}
      </StatusBadge>
    )
  }
];

export function UserAccountsTable({ accounts }: { accounts: AccountRow[] }) {
  return <DataTable columns={accountColumns} data={accounts} getRowId={(account) => account.id} />;
}
