import { z } from "zod";

import type { Permission } from "@/lib/auth/permissions";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { getPermissionGroups, permissionCatalog } from "@/services/authorization/rbacService";
import { createPersistedRole, listPersistedPermissionKeys, listPersistedRoles } from "@/services/authorization/rolePersistenceService";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";
import { recordAuditLog } from "@/services/audit/auditLog";

const permissionKeySchema = z.custom<Permission>(
  (value) => typeof value === "string" && permissionCatalog.some((permission) => permission.key === value),
  "Quyền không hợp lệ."
);

const roleCreateSchema = z.object({
  code: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  permissionKeys: z.array(permissionKeySchema).min(1)
});

export async function GET() {
  try {
    const user = await getRequestUser();
    requirePermission(user, "role.view");
    const [roles, persistedPermissionKeys] = await Promise.all([listPersistedRoles(), listPersistedPermissionKeys()]);
    return successResponse({
      roles,
      permissionGroups: getPermissionGroups().map((group) => ({
        ...group,
        permissions: group.permissions.filter((permission) => persistedPermissionKeys.has(permission.key))
      })).filter((group) => group.permissions.length > 0)
    });
  } catch (error) {
    logger.error("api.roles.list_failed");
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    const authorizedUser = requirePermission(user, "role.manage");
    const input = parseWithSchema(roleCreateSchema, await request.json());
    const role = await createPersistedRole(input);

    await recordAuditLog({
      actorId: authorizedUser.id,
      action: "role.created",
      entityType: "role",
      entityId: role.id,
      after: { code: role.code, name: role.name, permissionKeys: role.permissionKeys }
    });

    return successResponse({ role }, { status: 201 });
  } catch (error) {
    logger.error("api.roles.create_failed");
    return errorResponse(error);
  }
}
