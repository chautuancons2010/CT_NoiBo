import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizationCatalog } from "./OrganizationCatalog";

const catalog = { departments: [
  { id: "active", code: "PB01", name: "Điều hành", active: true, sortOrder: 0, headcount: 4 },
  { id: "inactive", code: "PB02", name: "Lưu trữ", active: false, sortOrder: 1, headcount: 0 }
], positions: [], employees: [] };
afterEach(() => vi.unstubAllGlobals());
describe("organization workflow", () => {
  it("retries a read failure rather than refreshing the route without reloading", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Mất kết nối")).mockResolvedValue({ ok: true, json: async () => ({ data: catalog }) });
    vi.stubGlobal("fetch", fetchMock); render(<OrganizationCatalog kind="departments" canManage />);
    const retry = await screen.findByRole("button", { name: "Thử lại" });
    expect(screen.queryByText("0 phòng ban")).not.toBeInTheDocument();
    fireEvent.click(retry); await screen.findByText("Điều hành");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("distinguishes filtered zero results and resets search and status together", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: catalog }) }));
    const { container } = render(<OrganizationCatalog kind="departments" canManage={false} />);
    await screen.findByText("Điều hành");
    fireEvent.change(container.querySelector("select")!, { target: { value: "inactive" } });
    expect(screen.queryByText("Điều hành")).not.toBeInTheDocument();
    expect(screen.getByText("Lưu trữ")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "không khớp" } });
    expect(screen.getByText("Không có phòng ban phù hợp")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getByText("Điều hành")).toBeInTheDocument();
    expect(screen.getByText("Lưu trữ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm phòng ban" })).not.toBeInTheDocument();
  });
  it("keeps fields and the underlying register on write failure and prevents pending duplicates", async () => {
    let rejectWrite: ((error: Error) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((_url, init) => init?.method === "POST" ? new Promise((_resolve, reject) => { rejectWrite = reject; }) : Promise.resolve({ ok: true, json: async () => ({ data: catalog }) }));
    vi.stubGlobal("fetch", fetchMock); render(<OrganizationCatalog kind="departments" canManage />);
    const create = await screen.findByRole("button", { name: "Thêm phòng ban" });
    await waitFor(() => expect(create).toBeEnabled()); fireEvent.click(create);
    const dialog = screen.getByRole("dialog"), code = within(dialog).getByLabelText(/Mã phòng ban/);
    fireEvent.change(code, { target: { value: "PB03" } });
    fireEvent.change(within(dialog).getByLabelText(/Tên phòng ban/), { target: { value: "Dự án" } });
    fireEvent.submit(dialog.querySelector("form")!); fireEvent.submit(dialog.querySelector("form")!);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    rejectWrite?.(new Error("Không thể lưu")); await within(dialog).findByText("Không thể lưu");
    expect(code).toHaveValue("PB03"); expect(screen.getByText("Điều hành")).toBeInTheDocument();
    expect(screen.queryByText("Không thể tải dữ liệu")).not.toBeInTheDocument();
  });
});
