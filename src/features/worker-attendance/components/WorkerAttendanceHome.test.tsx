import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerAttendanceSessionList, WorkerAttendanceToday } from "./WorkerAttendanceHome";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/components/providers/CurrentUserProvider", () => ({ useCurrentUser: () => ({ id: "engineer-one", permissions: ["worker_attendance.create", "worker_attendance.view", "project.view"] }) }));
vi.mock("@/lib/realtime/useDomainReconciliation", () => ({ useDomainReconciliation: vi.fn() }));
vi.mock("../client/workerDraftStore", () => ({ cacheWorkerTasks: vi.fn(), deleteWorkerDraft: vi.fn(), getLatestCachedWorkerTasks: vi.fn(), listWorkerDrafts: async () => [], saveWorkerDraft: vi.fn() }));
const task = { projectId: "project-one", projectName: "Công trường mẫu", worksiteId: "site-one", worksiteName: "Khu A", date: "2026-11-07", shiftCode: "DAY", shiftName: "Ca ngày", expectedWorkers: 1, checklist: [], roster: [{ workerId: "worker-one", workerName: "Công nhân", employeeCode: "CN01", assignmentRole: "worker" }] };
const result = { accountId: "engineer-one", tasks: [task], policy: {} };
const ok = (data: unknown) => ({ ok: true, json: async () => ({ ok: true, data }) });
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());
describe("field attendance home", () => {
  it("requires an explicit package selection before continuing and does not create a session on selection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(result));vi.stubGlobal("fetch", fetchMock);
    render(<WorkerAttendanceToday />);
    expect(await screen.findByRole("heading", { name: "Công trường mẫu" })).toBeInTheDocument();
    expect(screen.getByText("Ca ngày")).toBeInTheDocument();expect(screen.getByText("Chưa điểm danh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();
    const choice = screen.getByRole("radio", { name: "Chọn gói Công trường mẫu · Khu A · Ca ngày" });
    fireEvent.click(choice);
    expect(choice).toBeChecked();
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeEnabled();
    expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });
  it("opens the local draft without waiting for a session creation or GPS request", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok(result)).mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkerAttendanceToday />);
    fireEvent.click(await screen.findByRole("radio", { name: /Chọn gói/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(expect.stringMatching(/\/local-.*\/roster$/)));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("opens a submitted session for review instead of creating another one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ...result, tasks: [{ ...task, existingSessionId: "existing-one", existingStatus: "submitted" }] }));vi.stubGlobal("fetch", fetchMock);
    render(<WorkerAttendanceToday />);fireEvent.click(await screen.findByRole("button", { name: "Xem điểm danh" }));
    expect(navigation.push).toHaveBeenCalledWith("/worker-attendance/sessions/existing-one");
    expect(fetchMock.mock.calls).toHaveLength(1);
  });
  it("recovers an initial history read error with the owning retry action", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Mất kết nối thử nghiệm")).mockResolvedValue(ok([{ id: "session-one", ...task, status: "submitted" }]));vi.stubGlobal("fetch", fetchMock);
    render(<WorkerAttendanceSessionList />);
    fireEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByText("Công trường mẫu")).toBeInTheDocument());
    expect(screen.queryByText("Mất kết nối thử nghiệm")).not.toBeInTheDocument();expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
