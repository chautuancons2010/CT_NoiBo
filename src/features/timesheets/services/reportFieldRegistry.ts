import type { Permission } from "@/lib/auth/permissions";

export interface ReportField {
  key: string;
  label: string;
  width?: number;
  permission?: Permission;
  format?: "date" | "datetime" | "number" | "decimal" | "link" | "status" | "boolean";
}

export const reportFieldRegistry: Record<string, readonly ReportField[]> = {
  summary: [
    { key: "employeeCode", label: "Mã NV", width: 14 },
    { key: "employeeName", label: "Họ tên", width: 28 },
    { key: "departmentName", label: "Phòng ban", width: 22 },
    { key: "positionName", label: "Chức danh", width: 22 },
    { key: "scheduledWorkdays", label: "Ngày chuẩn", format: "decimal" },
    { key: "actualWorkdays", label: "Ngày công", format: "decimal" },
    { key: "workedMinutes", label: "Phút làm", format: "number" },
    { key: "lateDays", label: "Ngày trễ", format: "number" },
    { key: "lateMinutes", label: "Phút trễ", format: "number" },
    { key: "earlyLeaveDays", label: "Ngày về sớm", format: "number" },
    { key: "annualLeaveDays", label: "Phép năm", format: "decimal" },
    { key: "unpaidLeaveDays", label: "Nghỉ không lương", format: "decimal" },
    { key: "absentDays", label: "Vắng", format: "decimal" },
    { key: "exceptionCount", label: "Ngoại lệ", format: "number" }
  ],
  daily: [
    { key: "employeeCode", label: "Mã NV", width: 14 },
    { key: "employeeName", label: "Họ tên", width: 28 },
    { key: "workDate", label: "Ngày", format: "date" },
    { key: "shiftName", label: "Ca" },
    { key: "effectiveCheckIn", label: "Vào", format: "datetime" },
    { key: "effectiveCheckOut", label: "Ra", format: "datetime" },
    { key: "workMinutes", label: "Phút làm", format: "number" },
    { key: "workFraction", label: "Công", format: "decimal" },
    { key: "leaveFraction", label: "Nghỉ", format: "decimal" },
    { key: "lateMinutes", label: "Trễ", format: "number" },
    { key: "earlyLeaveMinutes", label: "Về sớm", format: "number" },
    { key: "status", label: "Trạng thái", format: "status" },
    { key: "sources", label: "Nguồn", width: 26, format: "status" },
    { key: "hrNote", label: "Ghi chú HR", width: 30 },
    { key: "exceptionCount", label: "Ngoại lệ", format: "number" }
  ],
  events: [
    { key: "employeeCode", label: "Mã NV" },
    { key: "employeeName", label: "Họ tên", width: 28 },
    { key: "attendanceDate", label: "Ngày", format: "date" },
    { key: "eventType", label: "Sự kiện", format: "status" },
    { key: "effectiveAt", label: "Thời gian", format: "datetime" },
    { key: "locationName", label: "Địa điểm", width: 24 },
    { key: "geofenceStatus", label: "GPS", format: "status" },
    { key: "photoStatus", label: "Ảnh", format: "status" },
    { key: "photoUrl", label: "Liên kết ảnh", permission: "attendance.photo.view", format: "link", width: 38 }
  ],
  leave: [
    { key: "requestNumber", label: "Mã đơn" },
    { key: "employeeCode", label: "Mã NV" },
    { key: "employeeName", label: "Họ tên", width: 28 },
    { key: "leaveTypeName", label: "Loại nghỉ" },
    { key: "startDate", label: "Từ ngày", format: "date" },
    { key: "endDate", label: "Đến ngày", format: "date" },
    { key: "calculatedDays", label: "Số ngày", format: "decimal" },
    { key: "status", label: "Trạng thái", format: "status" }
  ],
  balance: [
    { key: "employeeCode", label: "Mã NV" },
    { key: "employeeName", label: "Họ tên", width: 28 },
    { key: "leaveTypeName", label: "Loại phép" },
    { key: "year", label: "Năm", format: "number" },
    { key: "granted", label: "Được cấp", format: "decimal" },
    { key: "used", label: "Đã dùng", format: "decimal" },
    { key: "remaining", label: "Còn lại", format: "decimal" }
  ],
  ledger: [
    { key: "employeeCode", label: "Mã NV" },
    { key: "employeeName", label: "Họ tên", width: 28 },
    { key: "leaveTypeName", label: "Loại phép" },
    { key: "effectiveDate", label: "Ngày", format: "date" },
    { key: "transactionType", label: "Giao dịch", format: "status" },
    { key: "amount", label: "Số ngày", format: "decimal" },
    { key: "reason", label: "Lý do", width: 35 }
  ],
  employees: [
    { key: "employeeCode", label: "Mã NV" },
    { key: "fullName", label: "Họ tên", width: 28 },
    { key: "departmentName", label: "Phòng ban" },
    { key: "positionName", label: "Chức danh" },
    { key: "employmentTypeName", label: "Loại lao động" },
    { key: "companyEmail", label: "Email công ty", width: 28 },
    { key: "joinDate", label: "Ngày vào làm", format: "date" },
    { key: "employmentStatus", label: "Trạng thái", format: "status" },
    { key: "personalPhone", label: "Điện thoại", permission: "employee.export_sensitive" },
    { key: "personalEmail", label: "Email cá nhân", permission: "employee.export_sensitive", width: 28 },
    { key: "dateOfBirth", label: "Ngày sinh", permission: "employee.export_sensitive", format: "date" },
    { key: "currentAddress", label: "Địa chỉ", permission: "employee.export_sensitive", width: 35 }
  ],
  profile: [
    { key: "field", label: "Trường", width: 25 },
    { key: "value", label: "Giá trị", width: 45 }
  ],
  history: [
    { key: "effectiveDate", label: "Ngày hiệu lực", format: "date" },
    { key: "category", label: "Loại", format: "status" },
    { key: "value", label: "Nội dung", width: 45 }
  ]
};

export function allowedFields(
  sheet: string,
  permissions: readonly Permission[],
  requested?: Array<{ key: string; label: string; enabled: boolean; order: number }>
) {
  const registry = reportFieldRegistry[sheet] ?? [];
  const allowed = registry.filter((field) => !field.permission || permissions.includes(field.permission));
  if (!requested?.length) return allowed;
  const selected = new Map(requested.filter((item) => item.enabled).map((item) => [item.key, item]));
  return allowed
    .filter((field) => selected.has(field.key))
    .sort((a, b) => (selected.get(a.key)?.order ?? 0) - (selected.get(b.key)?.order ?? 0))
    .map((field) => ({ ...field, label: selected.get(field.key)?.label || field.label }));
}
