import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { provisionAccountSchema } from "@/features/employees/schemas/employeeSchemas";
import { provisionAccountInRepository } from "@/features/employees/services/employeeRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

export async function POST(
  request: Request,
  {
    params
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const user = await getRequestUser();
    const authorizedUser = requirePermission(user, "account.create");
    const { id } = await params;
    const input = parseWithSchema(provisionAccountSchema, await request.json());
    const result = provisionAccountInRepository(id, input, authorizedUser.id);

    return successResponse(
      {
        account: result.accountView,
        historyEvent: result.historyEvent
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("api.employees.account_provision_failed");
    return errorResponse(error);
  }
}
