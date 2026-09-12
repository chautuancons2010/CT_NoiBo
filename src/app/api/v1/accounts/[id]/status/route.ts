import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { accountStatusPatchSchema } from "@/features/employees/schemas/employeeSchemas";
import { updateAccountStatusInRepository } from "@/features/employees/services/employeeRepository";
import { toEmployeeAccountView } from "@/features/employees/services/employeeService";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";
import { recordAuditLog } from "@/services/audit/auditLog";

export async function PATCH(
  request: Request,
  {
    params
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const user = await getRequestUser();
    const input = parseWithSchema(accountStatusPatchSchema, await request.json());
    const requiredPermission = input.status === "active" ? "account.enable" : "account.disable";
    const authorizedUser = requirePermission(user, requiredPermission);
    const { id } = await params;
    const result = updateAccountStatusInRepository(id, input, authorizedUser.id);

    await recordAuditLog({
      actorId: authorizedUser.id,
      action: input.status === "disabled" ? "account.disabled" : "account.status_updated",
      entityType: "account",
      entityId: id,
      before: result.historyEvent?.before,
      after: result.historyEvent?.after,
      reason: input.reason
    });

    return successResponse({
      account: toEmployeeAccountView(result.account),
      historyEvent: result.historyEvent
    });
  } catch (error) {
    logger.error("api.accounts.status_failed");
    return errorResponse(error);
  }
}
