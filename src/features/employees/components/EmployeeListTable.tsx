"use client";

import Link from "next/link";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ArchiveEmployeeButton } from "@/features/employees/components/ArchiveEmployeeButton";
import type { Permission } from "@/lib/auth/permissions";
import type { EmployeeSummary } from "@/features/employees/types";

function selectedEmployeeHref(baseHref: string, employeeId: string): string {
  const separator = baseHref.includes("?") ? "&" : "?";
  return `${baseHref}${separator}selected=${encodeURIComponent(employeeId)}`;
}

function columnsFor(selectionBaseHref?: string): DataTableColumn<EmployeeSummary>[] {
  return [
  {
    id: "employeeCode",
    header: "Mã NV",
    cell: (employee) => (
      <Link className="table-link" href={selectionBaseHref ? selectedEmployeeHref(selectionBaseHref, employee.id) : `/employees/${employee.id}/profile`} title={employee.employeeCode}>
        {employee.employeeCode}
      </Link>
    ),
    sortable: true
  },
  {
    id: "fullName",
    header: "Họ tên",
    cell: (employee) => (
      <span className="employee-name-cell">
        <strong>{employee.fullName}</strong>
        <small>{employee.companyEmail ?? employee.displayName}</small>
      </span>
    )
  },
  {
    id: "departmentName",
    header: "Phòng ban",
    accessor: "departmentName",
    hiddenOnMobile: true
  },
  {
    id: "positionName",
    header: "Chức vụ",
    accessor: "positionName",
    hiddenOnMobile: true
  },
  {
    id: "employmentTypeName",
    header: "Loại",
    accessor: "employmentTypeName"
  },
  {
    id: "phone",
    header: "Số điện thoại",
    accessor: "phone",
    hiddenOnMobile: true
  },
  {
    id: "employmentStatus",
    header: "Trạng thái",
    cell: (employee) => (
      <StatusBadge tone={employee.employmentStatusTone}>{employee.employmentStatusLabel}</StatusBadge>
    )
  }
  ];
}

export interface EmployeeListTableProps {
  employees: EmployeeSummary[];
  permissions: readonly Permission[];
  selectionBaseHref?: string;
}

export function EmployeeListTable({ employees, permissions, selectionBaseHref }: EmployeeListTableProps) {
  return (
    <DataTable
      ariaLabel="Danh sách nhân viên"
      className="employee-table"
      actions={(employee) => (
        <DropdownMenu label={`Thao tác ${employee.employeeCode}`}>
          <Link href={`/employees/${employee.id}/profile`}>Xem hồ sơ</Link>
          <PermissionGate permissions={permissions} require="employee.edit">
            <Link href={`/employees/${employee.id}/edit`}>Chỉnh sửa</Link>
          </PermissionGate>
          <PermissionGate permissions={permissions} require="account.view">
            <Link href={`/employees/${employee.id}/account`}>Tài khoản</Link>
          </PermissionGate>
          <PermissionGate permissions={permissions} require="employee.archive">
            <ArchiveEmployeeButton employeeId={employee.id} />
          </PermissionGate>
        </DropdownMenu>
      )}
      columns={columnsFor(selectionBaseHref)}
      data={employees}
      emptyDescription="Thêm hồ sơ đầu tiên để bắt đầu quản lý nhân sự."
      emptyTitle="Chưa có nhân viên"
      getRowId={(employee) => employee.id}
      rowHrefPrefix="/employees/"
      rowHrefSuffix="/profile"
    />
  );
}
