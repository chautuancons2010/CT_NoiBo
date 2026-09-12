import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { sensitiveProfilePatchSchema } from "@/features/employees/schemas/employeeSchemas";
import { updateSensitiveProfileInRepository } from "@/features/employees/services/employeeRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";
import { recordAuditLog } from "@/services/audit/auditLog";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requirePermission(await getRequestUser(), "employee.edit_sensitive");
    const { id } = await params;
    const input = parseWithSchema(sensitiveProfilePatchSchema, await request.json());
    const result = updateSensitiveProfileInRepository(id, input, user.id);

    await recordAuditLog({
      actorId: user.id,
      action: "employee.sensitive_updated",
      entityType: "employee",
      entityId: id,
      before: result.historyEvent.before,
      after: result.historyEvent.after,
      reason: input.reason
    });

    return successResponse({ updatedAt: result.profile.updatedAt });
  } catch (error) {
    logger.error("api.employees.sensitive_patch_failed");
    return errorResponse(error);
  }
}
