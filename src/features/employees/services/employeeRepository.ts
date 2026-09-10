import {
  createEmployeeRecord,
  defaultEmployeeDataSet,
  findAccountForEmployee,
  findEmployee,
  offboardEmployee,
  provisionAccountForEmployee,
  updateEmployeeProfile,
  updateAccountStatus,
  type CreateEmployeeResult,
  type EmployeeDataSet,
  type ProvisionAccountResult
} from "@/features/employees/services/employeeService";
import { AppError } from "@/lib/api/errors";
import type {
  AppAccountRecord,
  EmployeeContract,
  EmployeeDocument,
  EmployeeEmergencyContact,
  EmployeeHistoryEvent,
  EmployeeRecord,
  EmployeeSensitiveProfile
} from "@/features/employees/types";
import type {
  AccountStatusPatchInput,
  CreateEmployeeInput,
  PatchEmployeeInput,
  ProvisionAccountInput
} from "@/features/employees/schemas/employeeSchemas";
import { getEmployeeDataSetFromSupabase } from "@/features/employees/services/employeeSupabaseRepository";

let employees: EmployeeRecord[] = [...defaultEmployeeDataSet.employees];
const sensitiveProfiles: EmployeeSensitiveProfile[] = [...defaultEmployeeDataSet.sensitiveProfiles];
const emergencyContacts: EmployeeEmergencyContact[] = [...defaultEmployeeDataSet.emergencyContacts];
const contracts: EmployeeContract[] = [...defaultEmployeeDataSet.contracts];
const documents: EmployeeDocument[] = [...defaultEmployeeDataSet.documents];
let history: EmployeeHistoryEvent[] = [...defaultEmployeeDataSet.history];
let accounts: AppAccountRecord[] = [...defaultEmployeeDataSet.accounts];

export function getEmployeeDataSet(): EmployeeDataSet {
  return {
    ...defaultEmployeeDataSet,
    employees,
    sensitiveProfiles,
    emergencyContacts,
    contracts,
    documents,
    history,
    accounts
  };
}

export async function getEmployeeDataSetAsync(): Promise<EmployeeDataSet> {
  return (await getEmployeeDataSetFromSupabase()) ?? getEmployeeDataSet();
}

export function createEmployeeInRepository(
  input: CreateEmployeeInput,
  actorAccountId: string
): CreateEmployeeResult {
  const result = createEmployeeRecord(input, actorAccountId, getEmployeeDataSet());
  employees = [result.employee, ...employees];
  history = [result.historyEvent, ...history];

  return result;
}

export function provisionAccountInRepository(
  employeeId: string,
  input: ProvisionAccountInput,
  actorAccountId: string
): ProvisionAccountResult {
  const dataSet = getEmployeeDataSet();
  const employee = findEmployee(employeeId, dataSet);
  if (!employee) {
    throw new AppError("NOT_FOUND", "Không tìm thấy hồ sơ nhân sự.");
  }

  const result = provisionAccountForEmployee(employee, input, actorAccountId, dataSet);
  accounts = [result.account, ...accounts];
  history = [result.historyEvent, ...history];

  return result;
}

export function patchEmployeeInRepository(
  employeeId: string,
  input: PatchEmployeeInput,
  actorAccountId: string
) {
  const dataSet = getEmployeeDataSet();
  const employee = findEmployee(employeeId, dataSet);
  if (!employee) {
    throw new AppError("NOT_FOUND", "Không tìm thấy hồ sơ nhân sự.");
  }

  if (input.employmentStatus === "terminated" && input.terminationDate) {
    const result = offboardEmployee({
      employee,
      account: findAccountForEmployee(employeeId, dataSet),
      terminationDate: input.terminationDate,
      reason: input.reason ?? input.terminationReason,
      actorAccountId
    });

    employees = employees.map((item) => (item.id === employeeId ? result.employee : item));

    if (result.account) {
      accounts = accounts.map((account) => (account.id === result.account?.id ? result.account : account));
    }

    history = [...result.historyEvents, ...history];

    return result;
  }

  const result = updateEmployeeProfile(employee, input, actorAccountId, dataSet);
  employees = employees.map((item) => (item.id === employeeId ? result.employee : item));
  history = [...result.historyEvents, ...history];

  return result;
}

export function updateAccountStatusInRepository(
  accountId: string,
  input: AccountStatusPatchInput,
  actorAccountId: string
) {
  const result = updateAccountStatus(accounts, accountId, input.status, actorAccountId, input.reason);
  accounts = accounts.map((account) => (account.id === accountId ? result.account : account));

  if (result.historyEvent) {
    history = [result.historyEvent, ...history];
  }

  return result;
}

export function getAccountForEmployeeFromRepository(employeeId: string): AppAccountRecord | undefined {
  return findAccountForEmployee(employeeId, getEmployeeDataSet());
}
