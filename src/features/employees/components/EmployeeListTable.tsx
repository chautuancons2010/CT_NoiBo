"use client";

import Link from "next/link";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Permission } from "@/lib/auth/permissions";
import type { EmployeeSummary } from "@/features/employees/types";

const columns: DataTableColumn<EmployeeSummary>[] = [
  {
    id: "employeeCode",
    header: "Mã NV",
    cell: (employee) => (
      <Link className="table-link" href={`/employees/${employee.id}/profile`}>
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
    id: "joinDate",
    header: "Ngày vào làm",
    accessor: "joinDate",
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

export interface EmployeeListTableProps {
  employees: EmployeeSummary[];
  permissions: readonly Permission[];
}

export function EmployeeListTable({ employees, permissions }: EmployeeListTableProps) {
  return (
    <DataTable
      actions={(employee) => (
        <DropdownMenu label={`Thao tác ${employee.employeeCode}`}>
          <Link href={`/employees/${employee.id}/profile`}>Xem hồ sơ</Link>
          <PermissionGate permissions={permissions} require="employee.edit">
            <Link href={`/employees/${employee.id}/employment`}>Chỉnh sửa</Link>
          </PermissionGate>
          <PermissionGate permissions={permissions} require="account.view">
            <Link href={`/employees/${employee.id}/account`}>Tài khoản</Link>
          </PermissionGate>
          <PermissionGate permissions={permissions} require="employee.archive">
            <button type="button">Lưu trữ</button>
          </PermissionGate>
        </DropdownMenu>
      )}
      columns={columns}
      data={employees}
      emptyDescription="Thêm hồ sơ đầu tiên để bắt đầu quản lý nhân sự."
      emptyTitle="Chưa có nhân viên"
      getRowId={(employee) => employee.id}
    />
  );
}
