import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { accountRolesPatchSchema } from "@/features/employees/schemas/employeeSchemas";
import { updateAccountRolesInRepository } from "@/features/employees/services/employeeRepository";
import { toEmployeeAccountView } from "@/features/employees/services/employeeService";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";
import { recordAuditLog } from "@/services/audit/auditLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requirePermission(await getRequestUser(), "account.assign_role");
    const { id } = await params;
    const input = parseWithSchema(accountRolesPatchSchema, await request.json());
    const result = updateAccountRolesInRepository(id, input.roleIds);

    await recordAuditLog({
      actorId: user.id,
      action: "account.roles_updated",
      entityType: "account",
      entityId: id,
      before: { roleIds: result.previousRoleIds },
      after: { roleIds: result.account.roleIds }
    });

    return successResponse({ account: toEmployeeAccountView(result.account) });
  } catch (error) {
    logger.error("api.accounts.roles_failed");
    return errorResponse(error);
  }
}
