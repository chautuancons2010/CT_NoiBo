import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput, Select } from "@/components/shared/FormControls";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PermissionDeniedState } from "@/components/shared/States";
import { can } from "@/lib/auth/permissions";
import { employeeListQuerySchema } from "@/features/employees/schemas/employeeSchemas";
import { EmployeeListTable } from "@/features/employees/components/EmployeeListTable";
import {
  employeeStatusMeta,
  getEmployeeFilterOptions,
  listEmployees
} from "@/features/employees/services/employeeService";
import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";

export interface EmployeeListPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildFilters(searchParams: EmployeeListPageProps["searchParams"]) {
  const parsed = employeeListQuerySchema.safeParse({
    q: firstParam(searchParams.q),
    departmentId: firstParam(searchParams.departmentId),
    positionId: firstParam(searchParams.positionId),
    employmentTypeId: firstParam(searchParams.employmentTypeId),
    status: firstParam(searchParams.status),
    page: firstParam(searchParams.page),
    pageSize: firstParam(searchParams.pageSize)
  });

  return parsed.success
    ? parsed.data
    : {
        page: 1,
        pageSize: 10
      };
}

function pageHref(
  filters: ReturnType<typeof buildFilters>,
  page: number
): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.employmentTypeId) params.set("employmentTypeId", filters.employmentTypeId);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(page));
  params.set("pageSize", String(filters.pageSize));

  return `/employees?${params.toString()}`;
}

export async function EmployeeListPage({ searchParams }: EmployeeListPageProps) {
  const user = await getRequestUser();

  if (!user || !can(user.permissions, "employee.view")) {
    return <PermissionDeniedState />;
  }

  const dataSet = await getEmployeeDataSetAsync();
  const filters = buildFilters(searchParams);
  const result = listEmployees(filters, user.permissions, dataSet);
  const filterOptions = getEmployeeFilterOptions(dataSet);

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <PermissionGate permissions={user.permissions} require="employee.create">
            <Link className="button button--primary button--md" href="/employees/new">
              <span className="button__icon">
                <Plus aria-hidden="true" size={16} />
              </span>
              <span>Thêm nhân viên</span>
            </Link>
          </PermissionGate>
        }
        title="Nhân viên"
      />

      <form action="/employees" method="get">
        <FilterBar
          actions={
            <>
              <Button leftIcon={<Search aria-hidden="true" size={16} />} type="submit" variant="primary">
                Lọc
              </Button>
              <Link className="button button--secondary button--md" href="/employees">
                Xóa lọc
              </Link>
            </>
          }
        >
          <SearchInput defaultValue={filters.q} label="Tìm nhân viên" name="q" placeholder="Mã, tên, SĐT, email" />
          <Select
            defaultValue={filters.departmentId ?? ""}
            label="Phòng ban"
            name="departmentId"
            options={filterOptions.departments.map((department) => ({
              label: department.name,
              value: department.id
            }))}
            placeholder="Tất cả"
          />
          <Select
            defaultValue={filters.positionId ?? ""}
            label="Chức vụ"
            name="positionId"
            options={filterOptions.positions.map((position) => ({
              label: position.name,
              value: position.id
            }))}
            placeholder="Tất cả"
          />
          <Select
            defaultValue={filters.employmentTypeId ?? ""}
            label="Loại"
            name="employmentTypeId"
            options={filterOptions.employmentTypes.map((employmentType) => ({
              label: employmentType.name,
              value: employmentType.id
            }))}
            placeholder="Tất cả"
          />
          <Select
            defaultValue={filters.status ?? ""}
            label="Trạng thái"
            name="status"
            options={Object.entries(employeeStatusMeta).map(([value, meta]) => ({
              label: meta.label,
              value
            }))}
            placeholder="Tất cả"
          />
        </FilterBar>
      </form>

      <div className="list-summary-bar">
        <span>{result.total} hồ sơ</span>
        <span>Server-side pagination · trang {result.page}/{result.pageCount}</span>
      </div>

      <EmployeeListTable employees={result.items} permissions={user.permissions} />

      <nav aria-label="Phân trang" className="pagination">
        {result.page <= 1 ? (
          <span className="button button--secondary button--md is-disabled">Trước</span>
        ) : (
          <Link className="button button--secondary button--md" href={pageHref(filters, result.page - 1)}>
            Trước
          </Link>
        )}
        <span>
          Trang {result.page} / {result.pageCount}
        </span>
        {result.page >= result.pageCount ? (
          <span className="button button--secondary button--md is-disabled">Sau</span>
        ) : (
          <Link className="button button--secondary button--md" href={pageHref(filters, result.page + 1)}>
            Sau
          </Link>
        )}
      </nav>
    </div>
  );
}
