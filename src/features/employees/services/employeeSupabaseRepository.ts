import "server-only";

import { AppError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  AppAccountRecord,
  Department,
  EmployeeContract,
  EmployeeDocument,
  EmployeeEmergencyContact,
  EmployeeHistoryEvent,
  EmployeeRecord,
  EmployeeSensitiveProfile,
  EmploymentType,
  Position
} from "@/features/employees/types";
import type { EmployeeDataSet } from "@/features/employees/services/employeeService";

type Row = Record<string, unknown>;

function text(row: Row, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" && value ? value : undefined;
}

function requiredText(row: Row, key: string): string {
  const value = text(row, key);
  if (!value) {
    throw new AppError("SERVER_ERROR", `Supabase row is missing ${key}.`);
  }

  return value;
}

function bool(row: Row, key: string, fallback = false): boolean {
  const value = row[key];
  return typeof value === "boolean" ? value : fallback;
}

function int(row: Row, key: string, fallback = 0): number {
  const value = row[key];
  return typeof value === "number" ? value : fallback;
}

function jsonRecord(row: Row, key: string): Record<string, unknown> | undefined {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function textArray(row: Row, key: string): string[] {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapDepartment(row: Row): Department {
  return {
    id: requiredText(row, "id"),
    code: requiredText(row, "code"),
    name: requiredText(row, "name"),
    parentDepartmentId: text(row, "parent_department_id"),
    managerEmployeeId: text(row, "manager_employee_id"),
    active: bool(row, "active", true),
    sortOrder: int(row, "sort_order")
  };
}

function mapPosition(row: Row): Position {
  return {
    id: requiredText(row, "id"),
    code: requiredText(row, "code"),
    name: requiredText(row, "name"),
    departmentId: text(row, "department_id"),
    active: bool(row, "active", true),
    sortOrder: int(row, "sort_order")
  };
}

function mapEmploymentType(row: Row): EmploymentType {
  return {
    id: requiredText(row, "id"),
    code: requiredText(row, "code"),
    name: requiredText(row, "name"),
    workerCategory: requiredText(row, "worker_category") as EmploymentType["workerCategory"],
    active: bool(row, "active", true),
    sortOrder: int(row, "sort_order")
  };
}

function mapEmployee(row: Row): EmployeeRecord {
  return {
    id: requiredText(row, "id"),
    employeeCode: requiredText(row, "employee_code"),
    fullName: requiredText(row, "full_name"),
    displayName: text(row, "display_name"),
    dateOfBirth: text(row, "date_of_birth"),
    gender: text(row, "gender") as EmployeeRecord["gender"],
    avatarAssetId: text(row, "avatar_file_id"),
    personalPhone: requiredText(row, "personal_phone"),
    normalizedPhone: requiredText(row, "normalized_phone"),
    personalEmail: text(row, "personal_email"),
    companyEmail: text(row, "company_email"),
    currentAddress: text(row, "current_address"),
    permanentAddress: text(row, "permanent_address"),
    province: text(row, "province"),
    ward: text(row, "ward"),
    country: requiredText(row, "country"),
    departmentId: requiredText(row, "department_id"),
    positionId: requiredText(row, "position_id"),
    employmentTypeId: requiredText(row, "employment_type_id"),
    managerEmployeeId: text(row, "manager_employee_id"),
    contractorName: text(row, "contractor_name"),
    joinDate: requiredText(row, "join_date"),
    probationStartDate: text(row, "probation_start_date"),
    officialDate: text(row, "official_date"),
    terminationDate: text(row, "termination_date"),
    terminationReason: text(row, "termination_reason"),
    employmentStatus: requiredText(row, "employment_status") as EmployeeRecord["employmentStatus"],
    profileStatus: requiredText(row, "profile_status") as EmployeeRecord["profileStatus"],
    profileCompleteness: int(row, "profile_completeness"),
    note: text(row, "note"),
    createdBy: text(row, "created_by"),
    createdAt: requiredText(row, "created_at"),
    updatedAt: requiredText(row, "updated_at"),
    rowVersion: int(row, "row_version", 1)
  };
}

function mapSensitiveProfile(row: Row): EmployeeSensitiveProfile {
  return {
    employeeId: requiredText(row, "employee_id"),
    nationalIdNumber: text(row, "national_id_number"),
    nationalIdIssuedDate: text(row, "national_id_issued_date"),
    nationalIdIssuedPlace: text(row, "national_id_issued_place"),
    nationalIdExpiryDate: text(row, "national_id_expiry_date"),
    nationalIdFrontFileId: text(row, "national_id_front_file_id"),
    nationalIdBackFileId: text(row, "national_id_back_file_id"),
    bankName: text(row, "bank_name"),
    bankAccountNumber: text(row, "bank_account_number"),
    bankAccountHolder: text(row, "bank_account_holder"),
    bankBranch: text(row, "bank_branch"),
    personalTaxCode: text(row, "personal_tax_code"),
    socialInsuranceCode: text(row, "social_insurance_code"),
    updatedBy: text(row, "updated_by"),
    updatedAt: requiredText(row, "updated_at")
  };
}

function mapEmergencyContact(row: Row): EmployeeEmergencyContact {
  return {
    id: requiredText(row, "id"),
    employeeId: requiredText(row, "employee_id"),
    fullName: requiredText(row, "full_name"),
    relation: requiredText(row, "relation"),
    phone: requiredText(row, "phone"),
    note: text(row, "note"),
    isPrimary: bool(row, "is_primary")
  };
}

function mapContract(row: Row): EmployeeContract {
  return {
    id: requiredText(row, "id"),
    employeeId: requiredText(row, "employee_id"),
    contractNumber: requiredText(row, "contract_number"),
    contractType: requiredText(row, "contract_type"),
    startDate: requiredText(row, "start_date"),
    endDate: text(row, "end_date"),
    status: requiredText(row, "status") as EmployeeContract["status"],
    attachmentFileId: text(row, "attachment_file_id"),
    note: text(row, "note")
  };
}

function mapDocument(row: Row): EmployeeDocument {
  return {
    id: requiredText(row, "id"),
    employeeId: requiredText(row, "employee_id"),
    documentType: requiredText(row, "document_type") as EmployeeDocument["documentType"],
    title: requiredText(row, "title"),
    fileId: requiredText(row, "file_id"),
    issuedDate: text(row, "issued_date"),
    expiryDate: text(row, "expiry_date"),
    note: text(row, "note"),
    sensitive: bool(row, "sensitive"),
    uploadedBy: requiredText(row, "uploaded_by"),
    uploadedAt: requiredText(row, "uploaded_at"),
    deletedAt: text(row, "deleted_at")
  };
}

function mapHistoryEvent(row: Row): EmployeeHistoryEvent {
  return {
    id: requiredText(row, "id"),
    employeeId: requiredText(row, "employee_id"),
    eventType: requiredText(row, "event_type") as EmployeeHistoryEvent["eventType"],
    eventDate: requiredText(row, "event_date"),
    actorAccountId: requiredText(row, "actor_account_id"),
    before: jsonRecord(row, "before_data"),
    after: jsonRecord(row, "after_data"),
    reason: text(row, "reason"),
    createdAt: requiredText(row, "created_at")
  };
}

function mapAccount(row: Row, roleIds: string[]): AppAccountRecord {
  return {
    id: requiredText(row, "id"),
    employeeId: text(row, "employee_id"),
    displayName: requiredText(row, "display_name"),
    loginEmail: text(row, "primary_email"),
    loginPhone: text(row, "phone"),
    employeeCodeIdentifier: text(row, "employee_code_identifier"),
    status: requiredText(row, "status") as AppAccountRecord["status"],
    roleIds,
    activatedAt: text(row, "activated_at"),
    disabledAt: text(row, "disabled_at"),
    lastLoginAt: text(row, "last_login_at"),
    createdAt: requiredText(row, "created_at"),
    updatedAt: requiredText(row, "updated_at")
  };
}

async function readTable(tableName: string): Promise<Row[]> {
  const client = getSupabaseServiceClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client.from(tableName).select("*");
  if (error) {
    logger.error("supabase.employee_repository.read_failed", {
      entityType: "supabase_table",
      entityId: tableName
    });
    throw new AppError(
      "SERVER_ERROR",
      `Không thể đọc bảng ${tableName}. Hãy kiểm tra migration Supabase đã được áp dụng.`
    );
  }

  return (data ?? []) as Row[];
}

export async function getEmployeeDataSetFromSupabase(): Promise<EmployeeDataSet | null> {
  if (!getSupabaseServiceClient()) {
    return null;
  }

  const [
    departmentRows,
    positionRows,
    employmentTypeRows,
    employeeRows,
    sensitiveRows,
    emergencyRows,
    contractRows,
    documentRows,
    historyRows,
    accountRows,
    accountRoleRows
  ] = await Promise.all([
    readTable("departments"),
    readTable("positions"),
    readTable("employment_types"),
    readTable("employees"),
    readTable("employee_sensitive_profiles"),
    readTable("employee_emergency_contacts"),
    readTable("employee_contracts"),
    readTable("employee_documents"),
    readTable("employee_history_events"),
    readTable("app_accounts"),
    readTable("account_roles")
  ]);

  const roleIdsByAccountId = new Map<string, string[]>();
  for (const row of accountRoleRows) {
    const accountId = text(row, "account_id");
    const roleId = text(row, "role_id");
    if (!accountId || !roleId) {
      continue;
    }

    roleIdsByAccountId.set(accountId, [...(roleIdsByAccountId.get(accountId) ?? []), roleId]);
  }

  return {
    employees: employeeRows.map(mapEmployee),
    departments: departmentRows.map(mapDepartment),
    positions: positionRows.map(mapPosition),
    employmentTypes: employmentTypeRows.map(mapEmploymentType),
    sensitiveProfiles: sensitiveRows.map(mapSensitiveProfile),
    emergencyContacts: emergencyRows.map(mapEmergencyContact),
    contracts: contractRows.map(mapContract),
    documents: documentRows.map(mapDocument),
    history: historyRows.map(mapHistoryEvent),
    accounts: accountRows.map((row) => mapAccount(row, roleIdsByAccountId.get(requiredText(row, "id")) ?? textArray(row, "role_ids")))
  };
}
