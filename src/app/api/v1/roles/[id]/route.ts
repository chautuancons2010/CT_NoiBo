import { z } from "zod";

import type { Permission } from "@/lib/auth/permissions";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { permissionCatalog } from "@/services/authorization/rbacService";
import { updateRoleInRepository } from "@/services/authorization/roleRepository";
import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";
import { recordAuditLog } from "@/services/audit/auditLog";

const permissionKeySchema = z.custom<Permission>(
  (value) => typeof value === "string" && permissionCatalog.some((permission) => permission.key === value),
  "Quyền không hợp lệ."
);

const rolePatchSchema = z.object({
  code: z.string().trim().min(2).max(60).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  permissionKeys: z.array(permissionKeySchema).min(1).optional()
});

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
    const authorizedUser = requirePermission(user, "role.manage");
    const { id } = await params;
    const input = parseWithSchema(rolePatchSchema, await request.json());
    const accounts = (await getEmployeeDataSetAsync()).accounts.map((account) => ({
      accountId: account.id,
      status: account.status,
      roleIds: account.roleIds
    }));
    const role = updateRoleInRepository(id, input, accounts);

    await recordAuditLog({
      actorId: authorizedUser.id,
      action: "role.updated",
      entityType: "role",
      entityId: id,
      after: { code: role.code, name: role.name, permissionKeys: role.permissionKeys }
    });

    return successResponse({ role });
  } catch (error) {
    logger.error("api.roles.patch_failed");
    return errorResponse(error);
  }
}
