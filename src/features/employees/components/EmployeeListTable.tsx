"use client";

import Link from "next/link";

import { Worklist, type DataTableColumn } from "@/components/shared/DataTable";
import { Avatar } from "@/components/shared/Avatar";
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
    id: "fullName",
    header: "Họ tên",
    priority: "primary",
    cell: (employee) => (
      <span className="employee-name-with-avatar">
        <Avatar imageUrl={employee.avatarAssetId ? `/api/v1/employees/${employee.id}/avatar` : undefined} loading="lazy" name={employee.fullName} />
        <span className="employee-name-cell">
          <Link className="table-link" href={selectionBaseHref ? selectedEmployeeHref(selectionBaseHref, employee.id) : `/employees/${employee.id}/profile`}><strong>{employee.fullName}</strong></Link>
          <small title={employee.companyEmail ?? employee.displayName}>{employee.companyEmail ?? employee.displayName}</small>
        </span>
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
    header: "Nhóm",
    accessor: "employmentTypeName"
  },
  {
    id: "phone",
    header: "Số điện thoại",
    width: "compact",
    accessor: "phone",
    hiddenOnMobile: true
  },
  {
    id: "employmentStatus",
    header: "Trạng thái",
    width: "standard",
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
    <Worklist
      ariaLabel="Danh sách nhân viên"
      className="employee-table"
      actions={(employee) => (
        <DropdownMenu label={`Thao tác ${employee.fullName}`}>
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
