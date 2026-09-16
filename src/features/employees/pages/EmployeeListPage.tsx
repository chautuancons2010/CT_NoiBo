import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput, Select } from "@/components/shared/FormControls";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Inspector, WorkbenchLayout, WorkCanvas } from "@/components/shared/Workbench";
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

function selectionHref(filters: ReturnType<typeof buildFilters>, employeeId?: string): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.employmentTypeId) params.set("employmentTypeId", filters.employmentTypeId);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (employeeId) params.set("selected", employeeId);
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
  const selectedId = firstParam(searchParams.selected);
  const selectedEmployee = result.items.find((employee) => employee.id === selectedId);
  const firstRecord = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastRecord = Math.min(result.page * result.pageSize, result.total);

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
          className="employee-filter-bar"
          actions={
            <>
              <Button leftIcon={<Search aria-hidden="true" size={16} />} type="submit" variant="primary">
                Lọc
              </Button>
              <Link className="button button--secondary button--md" href="/employees">
                Xóa
              </Link>
            </>
          }
        >
          <SearchInput defaultValue={filters.q} label="Tìm nhân viên" name="q" placeholder="Tìm mã, tên, SĐT, email" />
          <Select
            defaultValue={filters.departmentId ?? ""}
            label="Phòng ban"
            labelHidden
            name="departmentId"
            options={filterOptions.departments.map((department) => ({
              label: department.name,
              value: department.id
            }))}
            placeholder="Phòng ban: Tất cả"
          />
          <Select
            defaultValue={filters.positionId ?? ""}
            label="Chức vụ"
            labelHidden
            name="positionId"
            options={filterOptions.positions.map((position) => ({
              label: position.name,
              value: position.id
            }))}
            placeholder="Chức vụ: Tất cả"
          />
          <Select
            defaultValue={filters.employmentTypeId ?? ""}
            label="Loại"
            labelHidden
            name="employmentTypeId"
            options={filterOptions.employmentTypes.map((employmentType) => ({
              label: employmentType.name,
              value: employmentType.id
            }))}
            placeholder="Loại: Tất cả"
          />
          <Select
            defaultValue={filters.status ?? ""}
            label="Trạng thái"
            labelHidden
            name="status"
            options={Object.entries(employeeStatusMeta).map(([value, meta]) => ({
              label: meta.label,
              value
            }))}
            placeholder="Trạng thái: Tất cả"
          />
        </FilterBar>
      </form>

      <WorkbenchLayout className={selectedEmployee ? "employee-roster" : "employee-roster workbench-layout--solo"}>
        <WorkCanvas className="employee-roster__canvas">
          <div className="list-summary-bar"><span>{result.total} hồ sơ</span></div>
          <EmployeeListTable employees={result.items} permissions={user.permissions} selectionBaseHref={selectionHref(filters)} />
          <footer className="employee-table-footer">
            <span>{firstRecord}–{lastRecord} / {result.total} bản ghi</span>
            <nav aria-label="Phân trang" className="pagination">
              {result.page <= 1 ? <span aria-hidden="true" className="button button--secondary button--sm is-disabled"><ChevronLeft size={16} /></span> : <Link aria-label="Trang trước" className="button button--secondary button--sm" href={pageHref(filters, result.page - 1)}><ChevronLeft aria-hidden="true" size={16} /></Link>}
              <span>{result.page} / {result.pageCount}</span>
              {result.page >= result.pageCount ? <span aria-hidden="true" className="button button--secondary button--sm is-disabled"><ChevronRight size={16} /></span> : <Link aria-label="Trang sau" className="button button--secondary button--sm" href={pageHref(filters, result.page + 1)}><ChevronRight aria-hidden="true" size={16} /></Link>}
            </nav>
          </footer>
        </WorkCanvas>
        {selectedEmployee ? (
          <Inspector className="employee-roster__inspector" title="Hồ sơ đang chọn">
            <div className="employee-inspector-heading"><strong>{selectedEmployee.fullName}</strong><span className="operational-code">{selectedEmployee.employeeCode}</span><StatusBadge tone={selectedEmployee.employmentStatusTone}>{selectedEmployee.employmentStatusLabel}</StatusBadge></div>
            <dl className="employee-inspector-fields">
              <div><dt>Phòng ban</dt><dd>{selectedEmployee.departmentName}</dd></div>
              <div><dt>Chức vụ</dt><dd>{selectedEmployee.positionName}</dd></div>
              <div><dt>Loại nhân sự</dt><dd>{selectedEmployee.employmentTypeName}</dd></div>
              <div><dt>Ngày vào làm</dt><dd>{selectedEmployee.joinDate}</dd></div>
              <div><dt>Hồ sơ</dt><dd>{selectedEmployee.profileCompleteness}% hoàn thiện</dd></div>
              <div><dt>Tài khoản</dt><dd>{selectedEmployee.hasAccount ? "Đã liên kết" : "Chưa liên kết"}</dd></div>
            </dl>
            <div className="employee-inspector-actions"><Link className="button button--primary button--md" href={`/employees/${selectedEmployee.id}/profile`}>Mở hồ sơ đầy đủ</Link><Link className="button button--secondary button--md" href={selectionHref(filters)}>Đóng</Link></div>
          </Inspector>
        ) : null}
      </WorkbenchLayout>
    </div>
  );
}
