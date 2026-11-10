import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PersonalPage from "./page";
import { defaultSystemSettings } from "@/config/systemSettings";

const state = vi.hoisted(() => ({ mobile: true, permissions: ["attendance.self", "attendance.self.view", "worker_attendance.create", "worker_attendance.view", "profile.view"] }));
vi.mock("@/components/providers/CurrentUserProvider", () => ({ useCurrentUser: () => ({ id: "engineer-one", displayName: "Kỹ sư mẫu", username: "engineer", status: "active", permissions: state.permissions }) }));
vi.mock("@/components/providers/SystemSettingsProvider", () => ({ useSystemSettings: () => ({ settings: defaultSystemSettings }) }));
vi.mock("@/components/shared/ModuleLauncher", () => ({ ModuleLauncher: () => null }));
vi.mock("@/features/attendance/components/PersonalToday", () => ({ PersonalToday: () => <section data-testid="personal-attendance">Chấm công của tôi</section> }));
vi.mock("@/features/worker-attendance/components/WorkerAttendanceHome", () => ({ WorkerAttendanceToday: () => <section data-testid="field-today">Công trường được giao</section> }));
vi.mock("@/lib/ui/useMobileViewport", () => ({ useMobileViewport: () => state.mobile }));
vi.mock("@/features/auth/components/LogoutButton", () => ({ LogoutButton: () => <button>Đăng xuất</button> }));

beforeEach(() => { state.mobile = true; state.permissions = ["attendance.self", "attendance.self.view", "worker_attendance.create", "worker_attendance.view", "profile.view"]; });
describe("engineer phone home", () => {
  it("opens personal attendance without mounting the site dashboard on a phone", () => {
    render(<PersonalPage />);
    const personal = screen.getByTestId("personal-attendance");
    const workerLink = screen.getByRole("link", { name: "Điểm danh công nhân" });
    expect(screen.queryByTestId("field-today")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Công trường hôm nay" })).not.toBeInTheDocument();
    expect(workerLink).toHaveAttribute("href", "/worker-attendance/today");
    expect(personal.compareDocumentPosition(workerLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("keeps the personal home for someone without field attendance permission", () => {
    state.permissions = ["attendance.self", "attendance.self.view", "profile.view"];
    render(<PersonalPage />);
    expect(screen.queryByTestId("field-today")).not.toBeInTheDocument();
    expect(screen.getByTestId("personal-attendance")).toBeInTheDocument();
  });
});
