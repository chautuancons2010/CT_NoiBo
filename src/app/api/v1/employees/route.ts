import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import {
  createEmployeeSchema,
  employeeListQuerySchema
} from "@/features/employees/schemas/employeeSchemas";
import {
  buildEmployeeSummary,
  getEmployeeFilterOptions,
  listEmployees
} from "@/features/employees/services/employeeService";
import {
  createEmployeeInRepository,
  getEmployeeDataSet,
  getEmployeeDataSetAsync
} from "@/features/employees/services/employeeRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";
import { recordAuditLog } from "@/services/audit/auditLog";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser();
    const authorizedUser = requirePermission(user, "employee.view");
    const url = new URL(request.url);
    const query = parseWithSchema(employeeListQuerySchema, {
      q: url.searchParams.get("q"),
      departmentId: url.searchParams.get("departmentId"),
      positionId: url.searchParams.get("positionId"),
      employmentTypeId: url.searchParams.get("employmentTypeId"),
      status: url.searchParams.get("status"),
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    });
    const dataSet = await getEmployeeDataSetAsync();

    return successResponse({
      employees: listEmployees(query, authorizedUser.permissions, dataSet),
      filterOptions: getEmployeeFilterOptions(dataSet)
    });
  } catch (error) {
    logger.error("api.employees.list_failed");
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    const authorizedUser = requirePermission(user, "employee.create");
    const input = parseWithSchema(createEmployeeSchema, await request.json());
    const result = createEmployeeInRepository(input, authorizedUser.id);
    const dataSet = getEmployeeDataSet();

    await recordAuditLog({
      actorId: authorizedUser.id,
      action: "employee.created",
      entityType: "employee",
      entityId: result.employee.id,
      after: {
        employeeCode: result.employee.employeeCode,
        departmentId: result.employee.departmentId,
        positionId: result.employee.positionId,
        employmentStatus: result.employee.employmentStatus
      }
    });

    return successResponse(
      {
        employee: buildEmployeeSummary(result.employee, dataSet),
        historyEvent: result.historyEvent,
        duplicateWarnings: result.duplicateWarnings
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("api.employees.create_failed");
    return errorResponse(error);
  }
}
