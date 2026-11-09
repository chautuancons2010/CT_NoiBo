import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkerLocalDraft } from "../client/workerDraftStore";
import type { WorkerEntryStatus } from "../types/workerAttendanceTypes";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../client/workerDraftStore", () => ({ getWorkerDraft: vi.fn(), saveWorkerDraft: vi.fn(), deleteWorkerDraft: vi.fn() }));
vi.mock("../client/workerAttendanceSync", () => ({ fetchWorkerSession: vi.fn(), syncWorkerDraft: vi.fn(), readWorkerResponse: vi.fn() }));

import { getWorkerDraft, saveWorkerDraft } from "../client/workerDraftStore";
import { syncWorkerDraft } from "../client/workerAttendanceSync";
import { WorkerAttendanceWizard } from "./WorkerAttendanceWizard";
import { createWorkerSafetyReport } from "../services/workerSafetyReport";

function fixture(): WorkerLocalDraft {
  return {
    id: "session-1", ownerAccountId: "account-1", clientSessionId: "client-1", photos: [], pendingSubmit: false, retryCount: 0, updatedAt: "2026-10-12T01:00:00Z",
    session: {
      id: "session-1", clientSessionId: "client-1", projectId: "project-1", projectName: "Công trường kiểm thử", worksiteId: "site-1", worksiteName: "Khu A",
      date: "2026-10-12", shiftCode: "DAY", shiftName: "Ca ngày", sessionType: "morning", supervisorEmployeeId: "supervisor-1", supervisorName: "Giám sát",
      startedAt: "2026-10-12T01:00:00Z", capturedAtClient: "2026-10-12T01:00:00Z", geofenceStatus: "not_required", status: "in_progress", syncStatus: "synced", photoStatus: "not_required", version: 1,
      photos: [], adjustments: [], checklist: [], checklistResponses: [],
      entries: [1, 2].map(number => ({ id: `entry-${number}`, sessionId: "session-1", workerId: `worker-${number}`, employeeCode: `CN0${number}`, workerName: `Công nhân 0${number}`, assignmentRole: "worker", status: "unconfirmed", dayException: "none", isUnplanned: false }))
    }
  };
}

let stored: WorkerLocalDraft;
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  stored = fixture();
  vi.mocked(getWorkerDraft).mockImplementation(async () => structuredClone(stored));
  vi.mocked(saveWorkerDraft).mockImplementation(async value => { stored = structuredClone(value); });
  vi.mocked(syncWorkerDraft).mockImplementation(async value => value.session);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openRoster() {
  const view = render(<WorkerAttendanceWizard sessionId="session-1" step="roster" />);
  await screen.findByRole("group", { name: "Điểm danh Công nhân 01" });
  return view;
}
function row(number = 1) { return within(screen.getByRole("group", { name: `Điểm danh Công nhân 0${number}` })); }
async function savedStatus(status: WorkerEntryStatus, number = 1) { await waitFor(() => expect(stored.session.entries[number - 1].status).toBe(status)); }

describe("worker roster status buttons", () => {
  it("Có mặt is an actual button and confirms one worker", async () => {
    await openRoster();
    const present = row().getByRole("button", { name: "Có mặt" });
    expect(present).toHaveAttribute("type", "button");
    fireEvent.click(present);
    await savedStatus("present");
    expect(present).toHaveAttribute("aria-pressed", "true");
    expect(row().getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(stored.session.entries[1].status).toBe("unconfirmed");
    expect(screen.getByRole("button", { name: "Tiếp tục 1/2" })).toBeDisabled();
  });

  it.each(["absent", "leave", "late"] as const)("changes %s back to present and clears the previous reason", async status => {
    stored.session.entries[0].status = status;
    stored.session.entries[0].exceptionReason = status === "leave" ? "approved_leave" : "unknown";
    await openRoster();
    fireEvent.click(row().getByRole("button", { name: "Có mặt" }));
    await savedStatus("present");
    expect(stored.session.entries[0].exceptionReason).toBeUndefined();
    expect(row().getAllByRole("button", { pressed: true })).toHaveLength(1);
  });

  it("keeps both workers when two status buttons are tapped rapidly", async () => {
    await openRoster();
    act(() => {
      fireEvent.click(row(1).getByRole("button", { name: "Có mặt" }));
      fireEvent.click(row(2).getByRole("button", { name: "Đi trễ" }));
    });
    await savedStatus("late", 2);
    expect(stored.session.entries[0].status).toBe("present");
    expect(row(1).getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(row(2).getAllByRole("button", { pressed: true })).toHaveLength(1);
  });

  it("Có mặt tất cả preserves approved leave", async () => {
    stored.session.entries[1].status = "leave";
    stored.session.entries[1].exceptionReason = "approved_leave";
    await openRoster();
    fireEvent.click(screen.getByRole("button", { name: "Có mặt tất cả" }));
    await savedStatus("present");
    expect(stored.session.entries[1]).toMatchObject({ status: "leave", exceptionReason: "approved_leave" });
    expect(screen.getByRole("button", { name: "Tiếp tục 2/2" })).toBeEnabled();
  });

  it("removes a confirmed worker from Chưa xử lý without losing their status", async () => {
    await openRoster();
    fireEvent.click(screen.getByRole("button", { name: "Chưa xử lý" }));
    fireEvent.click(row().getByRole("button", { name: "Có mặt" }));
    await savedStatus("present");
    expect(screen.queryByRole("group", { name: "Điểm danh Công nhân 01" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Chưa xử lý" }));
    expect(row().getByRole("button", { name: "Có mặt" })).toHaveAttribute("aria-pressed", "true");
  });

  it("restores the saved selection when reopening the roster", async () => {
    const view = await openRoster();
    fireEvent.click(row().getByRole("button", { name: "Có mặt" }));
    await savedStatus("present");
    view.unmount();
    await openRoster();
    expect(row().getByRole("button", { name: "Có mặt" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports local storage failure and allows saving the selection again", async () => {
    vi.mocked(saveWorkerDraft).mockRejectedValueOnce(new Error("Quota exceeded"));
    await openRoster();
    fireEvent.click(row().getByRole("button", { name: "Có mặt" }));
    await screen.findByText(/Chưa lưu được điểm danh trên thiết bị/);
    fireEvent.click(row().getByRole("button", { name: "Có mặt" }));
    await savedStatus("present");
    expect(screen.queryByText(/Chưa lưu được điểm danh trên thiết bị/)).not.toBeInTheDocument();
  });

  it("waits only for device persistence before moving to photos", async () => {
    let finishWrite!: () => void;
    vi.mocked(saveWorkerDraft).mockImplementationOnce(value => new Promise<void>(resolve => {
      finishWrite = () => { stored = structuredClone(value); resolve(); };
    }));
    await openRoster();
    fireEvent.click(screen.getByRole("button", { name: "Có mặt tất cả" }));
    await waitFor(() => expect(saveWorkerDraft).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục 2/2" }));
    expect(syncWorkerDraft).not.toHaveBeenCalled();
    await act(async () => finishWrite());
    expect(await screen.findByRole("heading", { name: "Ảnh hiện trường" })).toBeInTheDocument();
    expect(stored.session.entries.every(entry => entry.status === "present")).toBe(true);
  });

  it("keeps each worker and the focused control in the same position after a tap", async () => {
    await openRoster();
    const first = screen.getByRole("group", { name: "Điểm danh Công nhân 01" });
    const second = screen.getByRole("group", { name: "Điểm danh Công nhân 02" });
    const present = within(first).getByRole("button", { name: "Có mặt" });
    present.focus();
    fireEvent.click(present);
    await savedStatus("present");
    expect(screen.getAllByRole("group", { name: /Điểm danh Công nhân/ })).toEqual([first, second]);
    expect(present).toHaveFocus();
    fireEvent.click(within(first).getByRole("button", { name: "Vắng" }));
    await savedStatus("absent");
    expect(screen.getAllByRole("group", { name: /Điểm danh Công nhân/ })).toEqual([first, second]);
  });

  it("saves an unfinished roster without advancing to photos or closing the day", async () => {
    await openRoster();
    fireEvent.click(row().getByRole("button", { name: "Có mặt" }));
    await savedStatus("present");
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    await screen.findByText("Đã lưu điểm danh.");
    expect(syncWorkerDraft).toHaveBeenCalledOnce();
    expect(stored.session.entries[1].status).toBe("unconfirmed");
    expect(stored.pendingSubmit).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("preserves the roster order after saving even if the server returns rows reversed", async () => {
    vi.mocked(syncWorkerDraft).mockImplementation(async value => ({ ...value.session, version: 2, entries: [...value.session.entries].reverse() }));
    await openRoster();
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    await screen.findByText("Đã lưu điểm danh.");
    expect(screen.getAllByRole("group", { name: /Điểm danh Công nhân/ }).map(group => group.getAttribute("aria-label"))).toEqual(["Điểm danh Công nhân 01", "Điểm danh Công nhân 02"]);
    expect(stored.session.version).toBe(2);
  });

  it("keeps an offline save on this screen with the unfinished roster", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await openRoster();
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    await screen.findByText("Đã lưu điểm danh trên thiết bị.");
    expect(syncWorkerDraft).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("worker selection workflow", () => {
  beforeEach(() => {
    stored.session.selectionMode = true;
    stored.session.minimumPhotos = 1;
    stored.session.safetyReport = { ...createWorkerSafetyReport(), briefing: createWorkerSafetyReport().briefing.map(item => ({ ...item, checked: true })), workArea: "SC05" };
    stored.session.workNote = "Thay bu lông, sơn cẩu";
    stored.session.entries = stored.session.entries.map(entry => ({ ...entry, isSelected: false }));
  });

  it("advances from selection through safety to camera while network synchronization is pending", async () => {
    vi.mocked(syncWorkerDraft).mockImplementation(() => new Promise(() => undefined));
    stored.session.checklist = [{ id: "safety-1", group: "Bảo hộ", content: "Đội mũ bảo hộ", required: true, sortOrder: 1 }];
    render(<WorkerAttendanceWizard sessionId="session-1" step="roster" />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Công nhân 01 · CN01" }));
    await waitFor(() => expect(syncWorkerDraft).toHaveBeenCalled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    const safety = await screen.findByRole("checkbox", { name: "Đội mũ bảo hộ *" });
    fireEvent.click(safety);
    fireEvent.click(screen.getByRole("checkbox", { name: "Xác nhận an toàn và sức khỏe" }));
    fireEvent.click(screen.getByRole("button", { name: "Chụp ảnh" }));
    expect(await screen.findByRole("heading", { name: "Ảnh hiện trường" })).toBeInTheDocument();
    expect(screen.getByLabelText("Chụp ảnh điểm danh")).toBeEnabled();
    expect(stored.session.safetyConfirmed).toBe(true);
    expect(stored.session.entries[0].isSelected).toBe(true);
  });

  it("selects actual attendees, keeps unchecked workers out of the count and persists rapid changes", async () => {
    render(<WorkerAttendanceWizard sessionId="session-1" step="roster" />);
    const first = await screen.findByRole("checkbox", { name: "Công nhân 01 · CN01" });
    expect(first).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();
    fireEvent.click(first);
    await waitFor(() => expect(stored.session.entries[0]).toMatchObject({ isSelected: true, status: "present" }));
    expect(stored.session.entries[1]).toMatchObject({ isSelected: false, status: "unconfirmed" });
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Thêm công nhân" })).not.toBeInTheDocument();
    act(() => {
      fireEvent.click(first);
      fireEvent.click(screen.getByRole("checkbox", { name: "Công nhân 02 · CN02" }));
    });
    await waitFor(() => expect(stored.session.entries.map(entry => entry.isSelected)).toEqual([false, true]));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByRole("heading", { name: "An toàn lao động" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/worker-attendance/sessions/session-1/review");
  });

  it("blocks direct navigation to photos without a worker selection", async () => {
    render(<WorkerAttendanceWizard sessionId="session-1" step="photos" />);
    expect(await screen.findByText("Chưa chọn công nhân")).toBeInTheDocument();
    expect(screen.queryByText("Ảnh toàn cảnh")).not.toBeInTheDocument();
  });

  it("blocks direct navigation to photos until safety is confirmed", async () => {
    stored.session.entries[0] = { ...stored.session.entries[0], isSelected: true, status: "present" };
    render(<WorkerAttendanceWizard sessionId="session-1" step="photos" />);
    expect(await screen.findByText("Chưa xác nhận an toàn")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gửi chấm công" })).not.toBeInTheDocument();
  });

  it("requires safety confirmation before moving to photo capture", async () => {
    stored.session.entries[0] = { ...stored.session.entries[0], isSelected: true, status: "present" };
    stored.session.photos = [{ id: "photo-1", sessionId: "session-1", capturedAt: stored.updatedAt, sortOrder: 0 }];
    render(<WorkerAttendanceWizard sessionId="session-1" step="review" />);
    const safety = await screen.findByRole("checkbox", { name: "Xác nhận an toàn và sức khỏe" });
    const send = screen.getByRole("button", { name: "Chụp ảnh" });
    expect(send).toBeDisabled();
    expect(screen.getByLabelText(/Nội dung công việc/)).toHaveValue("Thay bu lông, sơn cẩu");
    fireEvent.click(safety);
    await waitFor(() => expect(stored.session.safetyConfirmed).toBe(true));
    expect(send).toBeEnabled();
    fireEvent.click(send);
    expect(await screen.findByRole("heading", { name: "Ảnh hiện trường" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/worker-attendance/sessions/session-1/photos");
  });

  it("requires the actual safety briefing and work report and resets confirmation after an edit", async () => {
    stored.session.safetyReport = createWorkerSafetyReport();
    stored.session.workNote = "";
    stored.session.entries[0] = { ...stored.session.entries[0], isSelected: true, status: "present" };
    render(<WorkerAttendanceWizard sessionId="session-1" step="review" />);
    const confirm = await screen.findByRole("checkbox", { name: "Xác nhận an toàn và sức khỏe" });
    const next = screen.getByRole("button", { name: "Chụp ảnh" });
    fireEvent.click(confirm);
    expect(next).toBeDisabled();
    for (const topic of createWorkerSafetyReport().briefing) fireEvent.click(screen.getByRole("checkbox", { name: topic.content }));
    fireEvent.change(screen.getByLabelText(/Nội dung công việc/), { target: { value: "Thay bu lông, sơn cẩu" } });
    fireEvent.change(screen.getByLabelText(/Khu vực làm việc/), { target: { value: "SC05" } });
    expect(confirm).not.toBeChecked();
    fireEvent.click(confirm);
    await waitFor(() => expect(next).toBeEnabled());
    expect(stored.session.safetyReport).toMatchObject({ workArea: "SC05", healthStatus: "Tốt", supervisorCount: 1 });
    fireEvent.change(screen.getByLabelText(/Nội dung công việc/), { target: { value: "Sơn cẩu" } });
    expect(confirm).not.toBeChecked();
    expect(next).toBeDisabled();
  });
});
