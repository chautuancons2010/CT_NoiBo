import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { accountRolesPatchSchema } from "@/features/employees/schemas/employeeSchemas";
import { replaceAccountRoles } from "@/features/employees/services/employeeMutationService";
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
    await replaceAccountRoles(id, input, user.id);

    await recordAuditLog({
      actorId: user.id,
      action: "account.roles_updated",
      entityType: "account",
      entityId: id,
      after: { roleIds: input.roleIds }
    });

    return successResponse({ accountId: id, roleIds: input.roleIds });
  } catch (error) {
    logger.error("api.accounts.roles_failed");
    return errorResponse(error);
  }
}
