import { z } from "zod";
import { moduleKeys, type ModuleKey } from "@/config/systemSettings";
import { AppError, errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";
import { publishSettingsGroup, readModuleSettings } from "@/services/system-settings/systemSettingsService";

const schema = z.object({ enabled: z.boolean() }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ module: string }> }) {
  try {
    const user = await getRequestUser();
    requirePermission(user, "system_admin.access");
    const actor = requirePermission(user, "module.manage");
    const { module } = await context.params;
    if (!moduleKeys.includes(module as ModuleKey)) throw new AppError("NOT_FOUND");
    const { enabled } = await parseJsonBody(request, schema);
    const current = await readModuleSettings();
    const result = await publishSettingsGroup({ group: "modules", value: { ...current, [module]: enabled }, actorId: actor.id });
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
