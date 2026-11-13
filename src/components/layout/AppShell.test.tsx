import { render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/AppShell";
import { defaultSystemSettings } from "@/config/systemSettings";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

vi.mock("@/config/featureRelease", async (importOriginal) => ({ ...await importOriginal<typeof import("@/config/featureRelease")>(), isReleasedFeaturePath: () => true }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/accounting/payroll",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/providers/SystemSettingsProvider", () => ({
  useSystemSettings: () => ({ settings: defaultSystemSettings })
}));
vi.mock("@/components/providers/CurrentUserProvider", () => ({
  CurrentUserProvider: ({ children }: { children: ReactNode }) => children
}));
vi.mock("@/components/providers/RealtimeProvider", () => ({
  RealtimeProvider: ({ children }: { children: ReactNode }) => children,
  useRealtimeConnectionState: () => "connected"
}));
vi.mock("@/components/layout/MobileNavigationContext", () => ({
  MobileNavigationProvider: ({ children }: { children: ReactNode }) => children,
  useMobileNavigation: () => ({ override: null }),
  useOptionalMobileNavigation: () => null
}));
vi.mock("@/components/layout/AppHeader", () => ({
  AppHeader: () => <header>Châu Tuấn</header>,
  isMobileHeaderRootScreen: () => false
}));
vi.mock("@/components/layout/AppRail", () => ({
  AppRail: () => <aside><a href="#period-list">Kỳ lương</a></aside>
}));
vi.mock("@/features/shared-platforms/components/SystemNoticeBanner", () => ({ SystemNoticeBanner: () => null }));
vi.mock("@/lib/navigation/backHistory", () => ({ installBackHistory: () => () => undefined }));
vi.mock("@/lib/ui/workspacePreferencesRequest", () => ({ readWorkspacePreferences: async () => undefined }));
vi.mock("@/lib/ui/pageEntryMotion", () => ({ animatePageEntry: vi.fn(), supportsPageViewTransitions: () => true }));

const user: AuthenticatedUser = {
  id: "shell-review-account", displayName: "Kế toán", username: "accountant", email: "accountant@example.com", status: "active", permissions: ["payroll.view"]
};

describe("AppShell keyboard navigation", () => {
  it("offers a direct route to the existing main content before the navigation", async () => {
    render(<AppShell user={user}><h1>Bảng lương</h1><input aria-label="Tìm nhân viên" defaultValue="Đơn đang soạn" /></AppShell>);
    const skip = screen.getByRole("link", { name: "Đến nội dung chính" });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getAllByRole("link")[0]).toBe(skip);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(screen.getByLabelText("Tìm nhân viên")).toHaveValue("Đơn đang soạn"));
  });
  it("keeps the page title and its local return control in content", async () => {
    render(<AppShell user={user}><div><Link className="back-link" data-ui="back-control" href="/accounting">Kế toán</Link><header className="page-header" data-ui="page-header"><h1>Kỳ lương</h1></header></div></AppShell>);
    expect(screen.getByRole("heading", { name: "Kỳ lương" })).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Kế toán" })).toHaveAttribute("href", "/accounting");
    await waitFor(() => expect(document.querySelector(".app-content")).not.toHaveAttribute("data-mobile-title-in-bar"));
    expect(screen.queryByRole("navigation", { name: "Điều hướng quay lại" })).not.toBeInTheDocument();
  });
});
