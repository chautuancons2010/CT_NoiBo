import { z } from "zod";

import { endAssignmentSchema } from "@/features/projects/schemas/projectSchemas";
import { endAssignment } from "@/features/projects/services/projectRepository";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody, parseWithSchema } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

const paramsSchema = z.object({ id: z.string().uuid(), assignmentId: z.string().uuid() });

export async function PATCH(request: Request, context: RouteContext<"/api/v1/projects/[id]/assignments/[assignmentId]">) {
  try {
    const user = requirePermission(await getRequestUser(), "project.manage_team");
    const { id, assignmentId } = parseWithSchema(paramsSchema, await context.params);
    const { rowVersion } = await parseJsonBody(request, endAssignmentSchema);
    return successResponse(await endAssignment(user, id, assignmentId, rowVersion));
  } catch (error) { return errorResponse(error); }
}
