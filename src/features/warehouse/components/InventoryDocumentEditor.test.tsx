import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryDocumentEditor } from "./InventoryDocumentEditor";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/providers/CurrentUserProvider", () => ({ useCurrentUser: () => ({ permissions: ["warehouse.view"] }) }));
vi.mock("../client/warehouseClient", () => ({ warehouseRequest: mocks.read, warehouseWrite: mocks.write }));
vi.mock("./ItemImagePreview", () => ({ ItemImagePreview: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/v1/items")) return [{ id: "item-1", itemCode: "VT01", name: "Xi măng", baseUomId: "uom-1", uomCode: "bao" }];
    if (url === "/api/v1/warehouses") return [{ id: "store-1", code: "K01", name: "Kho chính", status: "active" }];
    if (url.includes("transaction-types")) return [{ code: "PURCHASE", label: "Nhập mua hàng" }];
    if (url.endsWith("references")) return { projects: [], worksites: [] };
    return [];
  });
  mocks.write.mockImplementation(async (_url: string, _method: string, payload: Record<string, unknown>) => ({ ...payload, id: "receipt-1", type: "receipt", status: "draft", rowVersion: 1, lines: (payload.lines as object[]).map((line, index) => ({ ...line, id: `line-${index}`, rowVersion: 1 })) }));
});

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

async function open() {
  const view = render(<InventoryDocumentEditor canCreate canPost canReverse={false} type="receipt" />);
  await screen.findByRole("combobox", { name: "Kho nhận" });
  return view;
}

describe("warehouse document entry", () => {
  it("keeps project allocation visible and required when the transaction type requires it", async () => {
    const original = mocks.read.getMockImplementation()!;
    mocks.read.mockImplementation((url: string) => url.includes("transaction-types") ? Promise.resolve([{ code: "PROJECT", label: "Nhập theo dự án", project_required: true }]) : original(url));
    await open();
    const project = screen.getByRole("combobox", { name: /^Dự án/ });
    expect(project).toHaveAttribute("aria-required", "true");
    expect(project.closest("details")).toBeNull();
  });

  it("keeps decimal quantity, unit, price and supplementary data in the draft save payload", async () => {
    await open();
    await choose("Kho nhận", "K01 · Kho chính");
    await choose("Hàng hóa 1", "VT01 · Xi măng");
    fireEvent.change(screen.getByRole("spinbutton", { name: /^Số lượng/ }), { target: { value: "2.75" } });
    fireEvent.change(screen.getByLabelText("Đơn giá"), { target: { value: "123.45" } });
    fireEvent.click(screen.getByText("Giao nhận & ghi chú", { selector: "summary" }));
    fireEvent.change(screen.getByLabelText("Người giao"), { target: { value: "Nhà cung cấp" } });
    fireEvent.click(screen.getByText("Chi tiết dòng hàng", { selector: "summary" }));
    fireEvent.change(screen.getByLabelText("Tham chiếu"), { target: { value: "PO-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledWith("/api/v1/warehouse/receipts", "POST", expect.objectContaining({
      targetWarehouseId: "store-1", deliveredBy: "Nhà cung cấp", lines: [expect.objectContaining({ itemId: "item-1", quantity: 2.75, uomId: "uom-1", uomCode: "bao", unitPrice: 123.45, reference: "PO-01" })]
    })));
    expect(mocks.replace).toHaveBeenCalledWith("/warehouse/receipts/receipt-1");
  });

  it("retains entered values when cancelling a reload and resets only after confirming", async () => {
    await open();
    fireEvent.change(screen.getByRole("spinbutton", { name: /^Số lượng/ }), { target: { value: "3.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Tải lại chứng từ" }));
    const dialog = screen.getByRole("dialog", { name: "Tải lại và bỏ thay đổi chưa lưu?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tiếp tục chỉnh sửa" }));
    expect(screen.getByRole("spinbutton", { name: /^Số lượng/ })).toHaveValue(3.25);
    expect(mocks.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tải lại chứng từ" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Tải lại" }));
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: /^Số lượng/ })).toHaveValue(1));
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("retains the first row values while adding and removing another row", async () => {
    const view = await open();
    fireEvent.change(screen.getByRole("spinbutton", { name: /^Số lượng/ }), { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm hàng" }));
    expect(view.container.querySelectorAll('[data-ui="editable-line"]')).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Xóa dòng 2" }));
    expect(screen.getByRole("spinbutton", { name: /^Số lượng/ })).toHaveValue(1.5);
    expect(screen.getByRole("button", { name: "Xóa dòng 1" })).toBeDisabled();
  });
});
