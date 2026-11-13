import { z } from "zod";

const locationSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().finite().nonnegative() });

export const workerSafetyReportSchema = z.object({
  contractorName: z.string().trim().min(1).max(120),
  supervisorCount: z.number().int().min(1).max(100),
  briefing: z.array(z.object({ content: z.string().trim().max(500), checked: z.boolean() })).min(1).max(20),
  healthStatus: z.string().trim().max(120),
  workArea: z.string().trim().max(200)
});

export const createWorkerSessionSchema = z.object({
  clientSessionId: z.string().uuid(), projectId: z.string().uuid(), worksiteId: z.string().uuid(), date: z.string().date(),
  shiftCode: z.string().trim().min(1).max(30).default("DAY"), sessionType: z.enum(["morning", "end_of_day", "overtime"]).default("morning"),
  overtimeConsentConfirmed: z.boolean().optional(),
  capturedAtClient: z.string().datetime({ offset: true }), location: locationSchema.optional()
});

export const workerWorkOperationSchema = z.object({ ownerAccountId: z.string().uuid(), batchId: z.string().uuid(), entryIds: z.array(z.string().uuid()).min(1).max(500).refine(ids => new Set(ids).size === ids.length), eventType: z.enum(["pause", "resume", "finish"]), effectiveAt: z.string().datetime({ offset: true }), reason: z.string().trim().min(2).max(500), evidenceRequired: z.boolean().optional(), evidencePhotoIds: z.array(z.string().uuid()).max(5).optional() }).strict();
export const overtimeReviewSchema = z.object({ version: z.number().int().positive(), decision: z.enum(["confirmed", "rejected"]), reason: z.string().trim().min(3).max(500) }).strict();

export const workerEntryPatchSchema = z.object({
  id: z.string().uuid(), status: z.enum(["unconfirmed", "present", "absent", "leave", "late", "transferred"]),
  isSelected: z.boolean().optional(),
  checkedInAt: z.string().datetime({ offset: true }).optional(),
  exceptionReason: z.enum(["approved_leave", "unapproved", "unknown", "other_worksite", "other"]).nullable().optional(),
  dayException: z.enum(["none", "early_leave", "transferred", "half_day", "overtime", "left_worksite"]).default("none"),
  exceptionTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(), note: z.string().trim().max(500).nullable().optional()
});

export const workerSessionDraftSchema = z.object({
  version: z.number().int().positive(), entries: z.array(workerEntryPatchSchema).max(500),
  workNote: z.string().trim().max(1500).nullable().optional(), note: z.string().trim().max(1000).nullable().optional(),
  safetyConfirmed: z.boolean().optional(),
  safetyReport: workerSafetyReportSchema.optional(),
  checklistResponses: z.array(z.object({
    itemId: z.string().uuid(), checked: z.boolean(), note: z.string().trim().max(500).nullable().optional()
  })).max(100).default([]),
  location: locationSchema.optional()
});

export const workerSessionSubmitSchema = z.object({ version: z.number().int().positive() });

export const workerOvertimeTimeEntrySchema = z.object({
  ownerAccountId: z.string().uuid(), clientSessionId: z.string().uuid(),
  projectId: z.string().uuid(), worksiteId: z.string().uuid(), shiftCode: z.string().trim().min(1).max(30),
  date: z.string().date(), capturedAtClient: z.string().datetime({ offset: true }),
  location: locationSchema.optional(),
  workerIds: z.array(z.string().uuid()).min(1, "Chọn công nhân tăng ca.").max(500).refine(ids => new Set(ids).size === ids.length),
  checkedInAt: z.string().datetime({ offset: true }), checkedOutAt: z.string().datetime({ offset: true }),
  breakStartedAt: z.string().datetime({ offset: true }).optional(), breakEndedAt: z.string().datetime({ offset: true }).optional(),
  consentConfirmed: z.literal(true, { errorMap: () => ({ message: "Cần xác nhận người tham gia đồng ý tăng ca." }) }),
  note: z.string().trim().max(1000).default("")
}).strict().superRefine((value, ctx) => {
  const start = Date.parse(value.checkedInAt), end = Date.parse(value.checkedOutAt);
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (end <= start) issue("checkedOutAt", "Giờ kết thúc phải sau giờ bắt đầu.");
  if (Number.isFinite(start) && new Date(start + 7 * 3600_000).toISOString().slice(0, 10) !== value.date) issue("checkedInAt", "Ngày bắt đầu không khớp ngày tăng ca.");
  if (Boolean(value.breakStartedAt) !== Boolean(value.breakEndedAt)) issue("breakEndedAt", "Nhập đủ giờ nghỉ và giờ làm tiếp.");
  if (value.breakStartedAt && value.breakEndedAt) {
    const pause = Date.parse(value.breakStartedAt), resume = Date.parse(value.breakEndedAt);
    if (!(start <= pause && pause < resume && resume <= end) || resume - pause >= end - start) issue("breakEndedAt", "Giờ nghỉ phải nằm trong khoảng tăng ca.");
  }
});

export const workerAdjustmentSchema = z.object({
  version: z.number().int().positive(), entryId: z.string().uuid(),
  status: z.enum(["present", "absent", "leave", "late", "transferred"]),
  reason: z.string().trim().min(3).max(500)
});

export const temporaryWorkerSchema = z.object({
  fullName: z.string().trim().min(2).max(120), phone: z.string().trim().max(20).optional(), contractorName: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(), unplannedReason: z.enum(["mobilized", "support", "replacement", "other"])
});

export const existingWorkerSchema = z.object({
  workerId: z.string().uuid(),
  unplannedReason: z.enum(["mobilized", "support", "replacement", "other"])
});

export const closeWorkerDaySchema = z.object({
  version: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500).default("Chốt ngày"),
  entries: z.array(z.object({
    id: z.string().uuid(),
    dayException: z.enum(["none", "early_leave", "transferred", "half_day", "overtime", "left_worksite"]),
    exceptionTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional()
  })).max(500)
});

export const workerAttendanceReminderSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().date()
});
