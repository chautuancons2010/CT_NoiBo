import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { nowServerReceivedAt } from "@/lib/time/timezone";
import { recordAuditLog } from "@/services/audit/auditLog";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

const auditLogSchema = z.object({
  action: z.string().min(3).max(120),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  before: z.record(z.unknown()).optional(),
  after: z.record(z.unknown()).optional(),
  reason: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional()
});

export async function GET() {
  try {
    const user = await getRequestUser();
    requirePermission(user, "audit.view");

    return successResponse({
      entries: [],
      note: "Audit storage sẽ đọc từ database sau khi migration được áp dụng."
    });
  } catch (error) {
    logger.error("api.audit_log.read_failed");
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    const authorizedUser = requirePermission(user, "audit.view");

    const input = parseWithSchema(auditLogSchema, await request.json());
    await recordAuditLog({
      actorId: authorizedUser.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      timestamp: nowServerReceivedAt(),
      before: input.before,
      after: input.after,
      reason: input.reason,
      metadata: input.metadata
    });

    return successResponse({ recorded: true }, { status: 201 });
  } catch (error) {
    logger.error("api.audit_log.write_failed");
    return errorResponse(error);
  }
}
