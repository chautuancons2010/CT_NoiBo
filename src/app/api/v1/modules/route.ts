import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";
import { readModuleSettings } from "@/services/system-settings/systemSettingsService";

export async function GET() {
  try {
    requireAuthenticatedUser(await getRequestUser());
    return successResponse({ modules: await readModuleSettings() });
  } catch (error) {
    return errorResponse(error);
  }
}
