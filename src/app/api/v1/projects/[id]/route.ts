import { z } from "zod";

import { getProject, renameProject } from "@/features/projects/services/projectRepository";
import { projectNamePatchSchema } from "@/features/projects/schemas/projectSchemas";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody, parseWithSchema } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

const paramsSchema = z.object({ id: z.string().uuid() });
export async function GET(_request: Request, context: RouteContext<"/api/v1/projects/[id]">) {
  try { const user = requirePermission(await getRequestUser(), "project.view"); const { id } = parseWithSchema(paramsSchema, await context.params); return successResponse(await getProject(id, user)); }
  catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: RouteContext<"/api/v1/projects/[id]">) {
  try {
    const user = requirePermission(await getRequestUser(), "project.edit");
    const { id } = parseWithSchema(paramsSchema, await context.params);
    return successResponse(await renameProject(user, id, await parseJsonBody(request, projectNamePatchSchema)));
  } catch (error) { return errorResponse(error); }
}
