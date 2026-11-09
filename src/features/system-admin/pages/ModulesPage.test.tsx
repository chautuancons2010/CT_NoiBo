import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemSettingsProvider } from "@/components/providers/SystemSettingsProvider";
import { defaultSystemSettings } from "@/config/systemSettings";
import { ModulesPage } from "./ModulesPage";

vi.mock("@/features/system-admin/components/AdminPage", () => ({ AdminPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = () => render(<SystemSettingsProvider initialSettings={structuredClone(defaultSystemSettings)}><ModulesPage /></SystemSettingsProvider>);

describe("module lock controls", () => {
  it("shows the inherited report lock while operations are locked", () => {
    render(<SystemSettingsProvider initialSettings={{ ...structuredClone(defaultSystemSettings), modules: { ...defaultSystemSettings.modules, operations: false } }}><ModulesPage /></SystemSettingsProvider>);
    expect(screen.getByText("Khóa theo Điều hành")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Khóa module Báo cáo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mở khóa module Đơn từ & Điều hành" })).toBeEnabled();
  });

  it("persists a lock immediately and allows reopening it", async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, data: { value: { ...defaultSystemSettings.modules, warehouse: false } } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, data: { value: defaultSystemSettings.modules } }) });
    vi.stubGlobal("fetch", fetch);
    show();
    fireEvent.click(screen.getByRole("button", { name: "Khóa module Kho" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mở khóa module Kho" }));
    await screen.findByRole("button", { name: "Khóa module Kho" });
    expect(fetch.mock.calls.map(([url, init]) => [url, JSON.parse(init.body)])).toEqual([
      ["/api/v1/modules/warehouse", { enabled: false }], ["/api/v1/modules/warehouse", { enabled: true }]
    ]);
  });

  it("keeps the current state on failure and lets the admin retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Không thể lưu." } }) }));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Khóa module Nhân sự" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể lưu.");
    expect(screen.getByRole("button", { name: "Khóa module Nhân sự" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Mở khóa module Nhân sự" })).not.toBeInTheDocument();
  });

  it("prevents overlapping updates while a lock is being saved", async () => {
    let finish!: (value: unknown) => void;
    const fetch = vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetch);
    show();
    fireEvent.click(screen.getByRole("button", { name: "Khóa module Kế toán" }));
    fireEvent.click(screen.getByRole("button", { name: "Khóa module Kho" }));
    expect(screen.getByRole("button", { name: "Khóa module Kho" })).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ok: true, json: async () => ({ ok: true, data: { value: { ...defaultSystemSettings.modules, accounting: false } } }) }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Khóa module Kho" })).toBeEnabled());
  });
});
