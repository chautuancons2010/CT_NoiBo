import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

const getSupabaseServiceClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServiceClient }));
vi.mock("@/services/audit/auditLog", () => ({ recordAuditLog: vi.fn() }));

import { createAssignment, endAssignment, renameProject } from "./projectRepository";

type Row = Record<string, unknown>;
const hr: AuthenticatedUser = { id: "11111111-1111-4111-8111-111111111111", username: "hr", email: "hr@example.com", displayName: "Nhân sự", status: "active", permissions: ["worker_attendance.view_all", "project.edit", "project.manage_team"] };
const assignment = { id: "assignment-1", project_id: "project-1", worksite_id: "site-1", employee_id: "worker-1", assignment_role: "worker", start_date: "2026-11-07", end_date: null, shift_code: "DAY", shift_name: "Ca ngày", shift_start: "07:00", shift_end: "17:00", status: "active", row_version: 2, employees: { employee_code: "CN01", full_name: "Công nhân", employment_status: "active" }, worksites: { name: "Khu A" } };

function database(assignments: Row[] = [assignment]) {
  const tables: Record<string, Row[]> = {
    projects: [{ id: "project-1", code: "GOI01", name: "Gói ban đầu", start_date: "2026-11-01", status: "active", row_version: 3 }],
    worksites: [{ id: "site-1", project_id: "project-1", name: "Khu A", status: "active", radius_meters: 100, gps_required: false, allowed_accuracy_threshold_meters: 100 }],
    project_assignments: assignments.map(row => ({ ...row })),
    app_accounts: [{ id: hr.id }]
  };
  const writes: Array<{ table: string; values: Row }> = [];
  getSupabaseServiceClient.mockReturnValue({
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      let update: Row | undefined;
      let insert: Row | undefined;
      function result(single = false) {
        const rows = (tables[table] ?? []).filter(row => filters.every(([key, value]) => row[key] === value));
        if (update) {
          for (const row of rows) { Object.assign(row, update, { row_version: Number(row.row_version ?? 0) + 1 }); writes.push({ table, values: update }); }
        }
        if (insert) {
          const row = { ...assignment, ...insert, id: "created-assignment", row_version: 1 };
          tables[table].push(row); rows.length = 0; rows.push(row); writes.push({ table, values: insert });
        }
        return { data: single ? rows[0] ?? null : rows, error: null };
      }
      const query = {
        select: () => query, order: () => query, limit: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        update: (values: Row) => { update = values; return query; },
        insert: (values: Row) => { insert = values; return query; },
        single: async () => result(true), maybeSingle: async () => result(true),
        then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve)
      };
      return query;
    }
  });
  return { tables, writes };
}

beforeEach(() => vi.clearAllMocks());

describe("HR attendance package administration", () => {
  it("renames a package with optimistic version checking", async () => {
    const { writes } = database();
    await expect(renameProject(hr, "project-1", { name: "Gói mới", rowVersion: 3 })).resolves.toMatchObject({ name: "Gói mới", rowVersion: 4 });
    expect(writes).toEqual([{ table: "projects", values: { name: "Gói mới" } }]);
  });

  it("rejects a stale rename without changing the package", async () => {
    const { writes } = database();
    await expect(renameProject(hr, "project-1", { name: "Gói mới", rowVersion: 2 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(writes).toHaveLength(0);
  });

  it("deactivates a worker membership without deleting the historical assignment", async () => {
    const { tables, writes } = database();
    await expect(endAssignment(hr, "project-1", "assignment-1", 2)).resolves.toMatchObject({ status: "inactive", rowVersion: 3 });
    expect(tables.project_assignments).toHaveLength(1);
    expect(writes).toEqual([{ table: "project_assignments", values: { status: "inactive" } }]);
  });

  it("rejects an assignment from another package and a stale membership version", async () => {
    const { writes } = database();
    await expect(endAssignment(hr, "project-1", "unrelated-assignment", 2)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(endAssignment(hr, "project-1", "assignment-1", 1)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(writes).toHaveLength(0);
  });

  it("allows a rotating worker to be available in multiple package rosters", async () => {
    const { writes } = database([{ ...assignment, project_id: "project-2", worksite_id: "site-2" }]);
    await expect(createAssignment(hr, "project-1", { employeeId: "worker-1", worksiteId: "site-1", assignmentRole: "worker", startDate: "2026-11-07", shiftCode: "DAY", shiftName: "Ca ngày", shiftStart: "07:00", shiftEnd: "17:00" })).resolves.toMatchObject({ projectId: "project-1", employeeId: "worker-1" });
    expect(writes).toHaveLength(1);
  });

  it("reactivates an ended membership when HR adds the same worker back", async () => {
    const { tables } = database([{ ...assignment, status: "inactive" }]);
    await expect(createAssignment(hr, "project-1", { employeeId: "worker-1", worksiteId: "site-1", assignmentRole: "worker", startDate: "2026-11-07", shiftCode: "DAY", shiftName: "Ca ngày", shiftStart: "07:00", shiftEnd: "17:00" })).resolves.toMatchObject({ id: "assignment-1", status: "active" });
    expect(tables.project_assignments).toHaveLength(1);
  });

  it("keeps name and roster administration unavailable to supervisors", async () => {
    const supervisor = { ...hr, permissions: ["worker_attendance.create"] as AuthenticatedUser["permissions"] };
    await expect(renameProject(supervisor, "project-1", { name: "Gói mới", rowVersion: 3 })).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(endAssignment(supervisor, "project-1", "assignment-1", 2)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(getSupabaseServiceClient).not.toHaveBeenCalled();
  });
});
