import { z } from "zod";

export const employeeStatusSchema = z.enum([
  "pending_onboarding",
  "probation",
  "active",
  "on_leave",
  "terminated"
]);

export const accountStatusSchema = z.enum([
  "pending_activation",
  "active",
  "disabled",
  "locked",
  "invited"
]);

const optionalText = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().min(1).optional()
);

const dateText = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có định dạng YYYY-MM-DD.");

const optionalDateText = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  dateText.optional()
);

const optionalEmail = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().email("Email chưa hợp lệ.").optional()
);

const pageNumber = z.coerce.number().int().positive().default(1);
const pageSizeNumber = z.coerce.number().int().min(1).max(100).default(10);

export const employeeListQuerySchema = z.object({
  q: optionalText,
  departmentId: optionalText,
  positionId: optionalText,
  employmentTypeId: optionalText,
  status: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    employeeStatusSchema.optional()
  ),
  page: pageNumber,
  pageSize: pageSizeNumber
});

const createEmployeeBaseSchema = z.object({
    employeeCode: z.string().trim().min(1, "Mã nhân viên là bắt buộc."),
    fullName: z.string().trim().min(2, "Họ và tên là bắt buộc."),
    displayName: optionalText,
    personalPhone: z.string().trim().min(8, "Số điện thoại là bắt buộc."),
    personalEmail: optionalEmail,
    companyEmail: optionalEmail,
    departmentId: z.string().uuid("Phòng ban không hợp lệ."),
    positionId: z.string().uuid("Chức vụ không hợp lệ."),
    employmentTypeId: z.string().uuid("Loại nhân sự không hợp lệ."),
    managerEmployeeId: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.string().uuid("Quản lý trực tiếp không hợp lệ.").optional()
    ),
    joinDate: dateText,
    probationStartDate: optionalDateText,
    officialDate: optionalDateText,
    employmentStatus: employeeStatusSchema.default("active"),
    currentAddress: optionalText,
    province: optionalText,
    contractorName: optionalText,
    note: optionalText
  });

export const createEmployeeSchema = createEmployeeBaseSchema
  .superRefine((value, context) => {
    if (value.officialDate && value.officialDate < value.joinDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["officialDate"],
        message: "Ngày chính thức không được trước ngày vào làm."
      });
    }
  });

export const patchEmployeeSchema = createEmployeeBaseSchema
  .partial()
  .extend({
    rowVersion: z.coerce.number().int().positive().optional(),
    terminationDate: optionalDateText,
    terminationReason: optionalText,
    reason: optionalText
  })
  .superRefine((value, context) => {
    if (value.terminationDate && value.joinDate && value.terminationDate < value.joinDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["terminationDate"],
        message: "Ngày nghỉ việc không được trước ngày vào làm."
      });
    }
  });

export const provisionAccountSchema = z.object({
  loginEmail: optionalEmail,
  loginPhone: optionalText,
  roleIds: z.array(z.string().min(1)).min(1, "Cần chọn ít nhất một vai trò.")
});

export const accountStatusPatchSchema = z
  .object({
    status: accountStatusSchema,
    reason: optionalText
  })
  .superRefine((value, context) => {
    if (value.status === "disabled" && !value.reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Cần nhập lý do vô hiệu hóa tài khoản."
      });
    }
  });

export const accountRolesPatchSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1, "Cần chọn ít nhất một vai trò.")
});

export const archiveEmployeeSchema = z.object({
  reason: z.string().trim().min(3, "Cần nhập lý do lưu trữ.").max(500)
});

export const sensitiveProfilePatchSchema = z
  .object({
    nationalIdNumber: optionalText,
    nationalIdIssuedDate: optionalDateText,
    nationalIdIssuedPlace: optionalText,
    nationalIdExpiryDate: optionalDateText,
    bankName: optionalText,
    bankAccountNumber: optionalText,
    bankAccountHolder: optionalText,
    bankBranch: optionalText,
    personalTaxCode: optionalText,
    socialInsuranceCode: optionalText,
    reason: optionalText
  })
  .superRefine((value, context) => {
    if (value.nationalIdNumber && !/^\d{9,12}$/.test(value.nationalIdNumber)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nationalIdNumber"],
        message: "Số CCCD/CMND chưa hợp lệ."
      });
    }
    if (value.nationalIdNumber && !value.reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Cần nhập lý do khi cập nhật CCCD."
      });
    }
    if (
      value.nationalIdIssuedDate &&
      value.nationalIdExpiryDate &&
      value.nationalIdExpiryDate < value.nationalIdIssuedDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nationalIdExpiryDate"],
        message: "Ngày hết hạn không được trước ngày cấp."
      });
    }
  });

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type PatchEmployeeInput = z.infer<typeof patchEmployeeSchema>;
export type ProvisionAccountInput = z.infer<typeof provisionAccountSchema>;
export type AccountStatusPatchInput = z.infer<typeof accountStatusPatchSchema>;
export type AccountRolesPatchInput = z.infer<typeof accountRolesPatchSchema>;
export type SensitiveProfilePatchInput = z.infer<typeof sensitiveProfilePatchSchema>;
