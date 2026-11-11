import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectAssignment, ProjectDetail } from "../types/projectTypes";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { buildProjectWorkerDays, includeAssignedWorkers, ProjectWorkerTimesheet } from "./ProjectWorkerTimesheet";

vi.mock("@/components/providers/CurrentUserProvider", () => ({ useCurrentUser: () => ({ permissions: ["worker_attendance.view", "worker_attendance.view_photo"] }) }));
vi.mock("@/lib/realtime/useDomainReconciliation", () => ({ useDomainReconciliation: vi.fn() }));
vi.mock("@/features/worker-attendance/components/WorkerAttendanceSessionDetail", () => ({ WorkerAttendanceSessionDetail: ({ readOnly, embedded, reviewOnly }: { readOnly?: boolean; embedded?: boolean; reviewOnly?: boolean }) => <section data-testid="evidence-detail" data-read-only={readOnly && embedded && reviewOnly}>Minh chứng chỉ xem</section> }));

const assignment = { id: "assignment-1", projectId: "package", employeeId: "worker-1", employeeCode: "CN01", employeeName: "Đỗ Anh", assignmentRole: "worker", startDate: "2026-11-01", shiftName: "Ca ngày", status: "active" } as ProjectAssignment;
const project = { id: "package", name: "Gói kiểm tra", code: "PKG", worksites: [], assignments: [assignment, { ...assignment, id: "assignment-2", employeeId: "worker-2", employeeCode: "CN02", employeeName: "Bình" }] } as unknown as ProjectDetail;
const session = { id: "round-1", projectId: "package", projectName: "Gói kiểm tra", date: "2026-11-10", shiftName: "Ca ngày", worksiteName: "Khu A", status: "submitted", submittedAt: "2026-11-10T01:00:00Z", startedAt: "2026-11-10T01:00:00Z", shiftBreakMinutes: 60, supervisorName: "Giám sát", entries: [{ id: "entry-1", workerId: "worker-1", employeeCode: "CN01", workerName: "Đỗ Anh", status: "present", isSelected: true, checkedInAt: "2026-11-10T01:00:00Z", checkedOutAt: "2026-11-10T10:00:00Z" }], photos: [{ id: "photo-1" }] } as WorkerAttendanceSession;
const second = { ...session, id: "round-2", startedAt: "2026-11-10T03:00:00Z", entries: [{ ...session.entries[0], checkedInAt: "2026-11-10T03:00:00Z" }], photos: [{ ...session.photos[0], id: "photo-2" }] };
const response = (sessions: WorkerAttendanceSession[]) => ({ ok: true, json: async () => ({ data: sessions }) });
afterEach(() => vi.unstubAllGlobals());

describe("package worker attendance viewer", () => {
  it("shows one worker day for repeated rounds and counts overlapping hours once", () => {
    expect(buildProjectWorkerDays([session, second, second])).toMatchObject([{ workerId: "worker-1", workMinutes: 480, workFraction: 1, photoCount: 2, status: "present" }]);
    expect(buildProjectWorkerDays([{ ...session, status: "in_progress", submittedAt: undefined }])).toEqual([]);
  });
  it("shows assigned workers without inventing attendance and excludes other dates or roles", () => {
    const scoped = { ...project, assignments: [...project.assignments, { ...assignment, employeeId: "future", startDate: "2026-12-01" }, { ...assignment, employeeId: "supervisor", assignmentRole: "engineer" as const }, { ...assignment, employeeId: "other-site", worksiteId: "other" }] };
    const rows = includeAssignedWorkers(scoped, session.date, "site", buildProjectWorkerDays([session]));
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.workerId === "worker-2")).toMatchObject({ status: "not_recorded", workFraction: 0, workMinutes: 0, sessions: [] });
  });
  it("keeps the package read-only and opens actual round evidence without construction tabs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([session, second])); vi.stubGlobal("fetch", fetchMock);
    render(<ProjectWorkerTimesheet project={project} initialDate={session.date} initialSessions={[session, second]} />);
    const table = screen.getByRole("table", { name: "Bảng công công nhân" });
    expect(within(table).getByText("Đỗ Anh")).toBeInTheDocument();
    expect(within(table).getByText("Bình")).toBeInTheDocument();
    expect(within(table).getByText("Chưa điểm danh")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Không gian làm việc gói" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tạo|Phân công|Điểm danh hôm nay/ })).not.toBeInTheDocument();
    fireEvent.click(within(table).getByRole("button", { name: "Xem điểm danh Đỗ Anh" }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.click(within(drawer).getAllByRole("button", { name: "Xem lượt · 1 ảnh" })[0]);
    expect(await screen.findByTestId("evidence-detail")).toHaveAttribute("data-read-only", "true");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });
  it("finds Vietnamese names without accents and clears evidence when the date changes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([session, second])));
    render(<ProjectWorkerTimesheet project={project} initialDate={session.date} initialSessions={[session, second]} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm công nhân trong bảng công" }), { target: { value: "do anh" } });
    const table = screen.getByRole("table", { name: "Bảng công công nhân" });
    expect(within(table).getByText("Đỗ Anh")).toBeInTheDocument();
    expect(within(table).queryByText("Bình")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ngày xem công"), { target: { value: "2026-11-09" } });
    expect(screen.queryByRole("button", { name: "2 lượt · 2 ảnh" })).not.toBeInTheDocument();
    expect(within(table).getByText("Chưa điểm danh")).toBeInTheDocument();
  });
});
