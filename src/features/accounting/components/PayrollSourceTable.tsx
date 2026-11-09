"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/shared/Avatar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/States";
import type { PayrollSourceEmployee } from "../payrollWorkspace";
import styles from "./PayrollDetailConsole.module.css";

const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);

export function PayrollSourceTable({ employees }: { employees: PayrollSourceEmployee[] }) {
  const columns: DataTableColumn<PayrollSourceEmployee>[] = [
    { id: "employee", header: "Nhân viên", priority: "primary", cell: employee => <div className={styles.sourcePerson}><Avatar name={employee.employeeName} /><Link className={styles.person} href={employee.actionHref}><strong>{employee.employeeName}</strong><small>{employee.employeeCode}</small></Link></div> },
    { id: "status", header: "Trạng thái", cell: employee => <StatusBadge tone={employee.issues.length ? "warning" : "success"}>{employee.statusLabel}</StatusBadge> },
    { id: "days", header: "Công tổng hợp", align: "right", cell: employee => <span className={styles.dayValue}>{employee.actualWorkdays}<small> / {employee.scheduledWorkdays}</small></span> },
    { id: "daily", header: "Công từng ngày", align: "right", cell: employee => <span className={employee.issues.some(issue => issue.code === "mismatch") ? styles.mismatch : styles.dayValue}>{employee.dailyCount ? employee.dailyWorkdays : "—"}</span> },
    { id: "salary", header: "Lương hợp đồng", align: "right", cell: employee => employee.salaryHistoryId ? money(employee.contractSalary) : <StatusBadge tone="warning">Chưa thiết lập</StatusBadge> }
  ];
  if (!employees.length) return <EmptyState title="Không có nhân viên phù hợp" />;
  return <>
    <div className={styles.desktopLines}><DataTable actions={employee => <Link className={styles.rowAction} href={employee.actionHref}>{employee.actionLabel}<ArrowUpRight aria-hidden="true" size={15} /></Link>} ariaLabel="Nhân viên từ bảng công" columns={columns} data={employees} emptyDescription="" emptyTitle="Không có nhân viên phù hợp" getRowId={employee => employee.employeeId} /></div>
    <div className={styles.mobileLines}>{employees.map(employee => <article className={styles.sourceMobile} key={employee.employeeId}>
      <header><Avatar name={employee.employeeName} /><Link className={styles.person} href={employee.actionHref}><strong>{employee.employeeName}</strong><small>{employee.employeeCode}</small></Link></header>
      <StatusBadge tone={employee.issues.length ? "warning" : "success"}>{employee.statusLabel}</StatusBadge>
      <dl><div><dt>Công tổng hợp</dt><dd>{employee.actualWorkdays} / {employee.scheduledWorkdays}</dd></div><div><dt>Công từng ngày</dt><dd className={employee.issues.some(issue => issue.code === "mismatch") ? styles.mismatch : undefined}>{employee.dailyCount ? employee.dailyWorkdays : "—"}</dd></div><div><dt>Lương hợp đồng</dt><dd>{employee.salaryHistoryId ? money(employee.contractSalary) : "Chưa thiết lập"}</dd></div></dl>
      <Link className={styles.rowAction} href={employee.actionHref}>{employee.actionLabel}<ArrowUpRight aria-hidden="true" size={16} /></Link>
    </article>)}</div>
  </>;
}
