import { useSyncExternalStore } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectSummary } from "../types/projectTypes";
import { ProjectPortfolioWorkspace } from "./ProjectPortfolioWorkspace";

const reconciliation = vi.hoisted(() => ({ reload: undefined as undefined | (() => Promise<void>) }));
vi.mock("@/lib/realtime/useDomainReconciliation", () => ({ useDomainReconciliation: (_domain: string, reload: () => Promise<void>) => { reconciliation.reload = reload; } }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/projects",
  useSearchParams: () => new URLSearchParams(useSyncExternalStore(listener => { window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener); }, () => window.location.search, () => ""))
}));

const base: ProjectSummary = { id: "one", code: "PKG-001", name: "Bảo trì đường ray", customerName: "Cảng ABC", projectManagerName: "Nguyễn Thị Mỹ", startDate: "2026-10-01", expectedEndDate: "2026-11-03", status: "active", health: "on_track", currentPeople: 15, worksiteCount: 1, rowVersion: 1 };
const projects: ProjectSummary[] = [base, { ...base, id: "two", code: "PKG-002", name: "Gói sắp tới", status: "preparing" }, { ...base, id: "three", code: "PKG-003", name: "Gói đã xong", status: "completed" }, { ...base, id: "four", code: "PKG-004", name: "Gói tạm dừng", status: "paused" }, { ...base, id: "five", code: "PKG-005", name: "Gói đã đóng", status: "closed" }];
const response = (data = projects) => ({ ok: true, json: async () => ({ data }) });

beforeEach(() => {
  window.history.replaceState(null, "", "/projects");
  const replace = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "replaceState").mockImplementation((data, unused, url) => { replace(data, unused, url); window.dispatchEvent(new PopStateEvent("popstate")); });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("project list tasks", () => {
  it("filters immediately while retaining unfiltered counts and distinct statuses", async () => {
    render(<ProjectPortfolioWorkspace />);
    const filters = screen.getByRole("navigation", { name: "Lọc trạng thái gói" });
    await within(filters).findByRole("button", { name: "Tất cả 5" });
    fireEvent.click(within(filters).getByRole("button", { name: "Đang thực hiện 1" }));
    expect(screen.getByRole("table")).toHaveTextContent("Bảo trì đường ray");
    expect(screen.getByRole("table")).not.toHaveTextContent("Gói sắp tới");
    expect(within(filters).getByRole("button", { name: "Sắp tới 1" })).toBeInTheDocument();
    fireEvent.click(within(filters).getByRole("button", { name: "Tạm dừng 1" }));
    expect(screen.getByRole("table")).toHaveTextContent("Gói tạm dừng");
    expect(screen.getByRole("table")).not.toHaveTextContent("Bảo trì đường ray");
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("finds codes and unaccented names and resets an empty result in one action", async () => {
    render(<ProjectPortfolioWorkspace />);
    await screen.findByText("Bảo trì đường ray");
    const search = screen.getByRole("searchbox", { name: "Tìm gói" });
    fireEvent.change(search, { target: { value: "PKG-002" } });
    expect(screen.getByRole("table")).toHaveTextContent("Gói sắp tới");
    fireEvent.change(search, { target: { value: "bao tri duong" } });
    expect(screen.getByRole("table")).toHaveTextContent("Bảo trì đường ray");
    fireEvent.change(search, { target: { value: "khong-co-goi-nay" } });
    expect(screen.getByRole("heading", { name: "Không tìm thấy gói" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(search).toHaveValue("");
    expect(screen.getByRole("table")).toHaveTextContent("Gói đã đóng");
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("restores filters from the URL and keeps unrelated parameters", async () => {
    window.history.replaceState(null, "", "/projects?q=PKG-001&status=active&source=test");
    render(<ProjectPortfolioWorkspace />);
    await screen.findByText("Bảo trì đường ray");
    expect(screen.getByRole("searchbox", { name: "Tìm gói" })).toHaveValue("PKG-001");
    expect(screen.getByRole("button", { name: "Đang thực hiện 1" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Xóa lọc" }));
    expect(window.location.search).toBe("?source=test");
  });
  it("keeps the default viewer read-only and restores the authorized admin creation entry", async () => {
    vi.mocked(fetch).mockResolvedValue(response([]) as Response);
    const { rerender } = render(<ProjectPortfolioWorkspace />);
    await screen.findByRole("heading", { name: "Chưa có gói" });
    expect(screen.queryByRole("link", { name: "Tạo gói" })).not.toBeInTheDocument();
    rerender(<ProjectPortfolioWorkspace canCreate />);
    expect(screen.getByRole("link", { name: "Tạo gói" })).toHaveAttribute("href","/projects/new");
    expect(screen.queryByRole("button", { name: /Tạo|Chỉnh sửa|Phân công/ })).not.toBeInTheDocument();
  });
  it("opens only the worker attendance viewer from each package", async () => {
    render(<ProjectPortfolioWorkspace />);
    const name = await screen.findByText("Bảo trì đường ray");
    expect(name.closest("a")).toHaveAttribute("href", "/projects/one/attendance");
    expect(screen.getByRole("columnheader", { name: "Trạng thái" })).toBeInTheDocument();
    for (const title of ["Phụ trách", "Nhân sự", "Hạn hoàn thành"]) expect(screen.queryByRole("columnheader", { name: title })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tạo gói" })).not.toBeInTheDocument();
  });
  it("uses the management destination for an editor's name link and keeps edit and delete controls available", async () => {
    render(<ProjectPortfolioWorkspace canEdit />);
    const name = await screen.findByText("Bảo trì đường ray");
    expect(name.closest("a")).toHaveAttribute("href", "/projects/one/attendance");
    expect(screen.getByRole("button", { name: "Sửa gói Bảo trì đường ray" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa gói Bảo trì đường ray" })).toBeInTheDocument();
  });
  it("retries failed loads without losing the search", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Mất kết nối"));
    window.history.replaceState(null, "", "/projects?q=PKG-001");
    render(<ProjectPortfolioWorkspace />);
    await screen.findByRole("heading", { name: "Không thể tải danh sách gói" });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Bảo trì đường ray");
    expect(screen.getByRole("searchbox", { name: "Tìm gói" })).toHaveValue("PKG-001");
  });
  it("retains the current rows after a background refresh fails", async () => {
    render(<ProjectPortfolioWorkspace />);
    await screen.findByText("Bảo trì đường ray");
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Mất kết nối"));
    await act(async () => { await reconciliation.reload?.(); });
    expect(screen.getByRole("table")).toHaveTextContent("Bảo trì đường ray");
    expect(screen.getByRole("alert")).toHaveTextContent("Mất kết nối");
  });
});
