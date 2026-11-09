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
  it("places assigned field work before personal attendance on a phone", () => {
    render(<PersonalPage />);
    const field = screen.getByTestId("field-today"), personal = screen.getByTestId("personal-attendance");
    expect(field.compareDocumentPosition(personal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Công trường hôm nay" })).toBeInTheDocument();
  });
  it("keeps the personal home for someone without field attendance permission", () => {
    state.permissions = ["attendance.self", "attendance.self.view", "profile.view"];
    render(<PersonalPage />);
    expect(screen.queryByTestId("field-today")).not.toBeInTheDocument();
    expect(screen.getByTestId("personal-attendance")).toBeInTheDocument();
  });
});
