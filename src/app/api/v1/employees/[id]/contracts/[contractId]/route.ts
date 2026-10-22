import { z } from "zod";

import { employeeContractInputSchema } from "@/features/employees/schemas/employeeSchemas";
import { archiveContract, updateContract } from "@/features/employees/services/contractService";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody, parseWithSchema } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

const paramsSchema = z.object({ id: z.string().uuid(), contractId: z.string().uuid() });
const archiveSchema = z.object({ reason: z.string().trim().min(3).max(500) });
function fields(form: FormData) { return { contractNumber: form.get("contractNumber"), contractType: form.get("contractType"), signedDate: form.get("signedDate") || undefined, effectiveDate: form.get("effectiveDate"), endDate: form.get("endDate") || undefined, status: form.get("status") || "draft", note: form.get("note") || undefined }; }

export async function PATCH(request: Request, context: RouteContext<"/api/v1/employees/[id]/contracts/[contractId]">) {
  try {
    const { id, contractId } = parseWithSchema(paramsSchema, await context.params), form = await request.formData();
    const input = parseWithSchema(employeeContractInputSchema, fields(form)), candidate = form.get("file"), file = candidate instanceof File && candidate.size ? candidate : undefined;
    return successResponse(await updateContract(requireAuthenticatedUser(await getRequestUser()), id, contractId, input, file));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: RouteContext<"/api/v1/employees/[id]/contracts/[contractId]">) {
  try { const { id, contractId } = parseWithSchema(paramsSchema, await context.params), { reason } = await parseJsonBody(request, archiveSchema); return successResponse(await archiveContract(requireAuthenticatedUser(await getRequestUser()), id, contractId, reason)); }
  catch (error) { return errorResponse(error); }
}
