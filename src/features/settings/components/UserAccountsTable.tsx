"use client";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { listAccounts } from "@/features/employees/services/employeeService";

type AccountRow = ReturnType<typeof listAccounts>[number];

const accountColumns: DataTableColumn<AccountRow>[] = [
  {
    id: "displayName",
    header: "Tai khoan",
    cell: (account) => (
      <span className="employee-name-cell">
        <strong>{account.displayName}</strong>
        <small>{account.loginEmail ?? account.loginPhone ?? account.employeeCodeIdentifier}</small>
      </span>
    )
  },
  {
    id: "employee",
    header: "Ho so nhan su",
    cell: (account) => account.employeeName ?? "Chua lien ket"
  },
  {
    id: "roles",
    header: "Vai tro",
    cell: (account) => account.roleNames.join(", ")
  },
  {
    id: "effectivePermissions",
    header: "Effective permissions",
    cell: (account) => `${account.effectivePermissions.length} quyen`
  },
  {
    id: "status",
    header: "Trang thai",
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
