export type PayrollStatus = "draft" | "calculated" | "reviewed" | "locked" | "published";

export interface SalaryRecord { id: string; employeeId: string; employeeCode: string; employeeName: string; baseSalary: number; allowance: number; bonus: number; deduction: number; effectiveDate: string; note?: string; reason: string; changedAt: string; changedByName?: string; }
export interface PayrollPeriod { id: string; periodMonth: string; timesheetPeriodId?: string; status: PayrollStatus; rowVersion: number; lineCount: number; grossTotal: number; deductionTotal: number; netTotal: number; note?: string; updatedAt: string; }
export interface PayrollLine { id: string; employeeId: string; employeeCode: string; employeeName: string; workDays: number; baseSalary: number; allowance: number; bonus: number; deduction: number; netSalary: number; rowVersion: number; }
export interface PayrollDetail extends PayrollPeriod { lines: PayrollLine[]; }
export interface Payslip { id: string; payrollLineId: string; employeeId: string; employeeCode: string; employeeName: string; periodMonth: string; version: number; status: "draft" | "published" | "revoked"; snapshot: Record<string, unknown>; publishedAt?: string; viewedAt?: string; revokedAt?: string; revokeReason?: string; }
