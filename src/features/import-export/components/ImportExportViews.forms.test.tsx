import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mock.push, refresh: mock.refresh, back: vi.fn() }), usePathname: () => "/import-export/shipments/new" }));
vi.mock("./importExportClient", () => ({ requestImportExport: mock.api, useImportExportData: () => ({ data: { partners: [{ id: "supplier", name: "Nhà cung cấp", partnerCode: "NCC01", partnerTypes: ["supplier"] }], contracts: [], transportModes: ["sea"], items: [{ id: "item", item_code: "VT01", name: "Vật tư", base_uom_id: "uom" }], uom: [{ id: "uom", code: "KG" }] }, loading: false, error: "", reload: vi.fn() }) }));
import { ContractEditor, ShipmentEditor } from "./ImportExportViews";
beforeEach(() => { vi.clearAllMocks(); mock.api.mockResolvedValue({ id: "saved" }); });
afterEach(() => vi.unstubAllGlobals());
describe("grouped import/export editors", () => {
  it("preserves fractional shipment quantities, unit and route fields in the payload", async () => {
    const { container } = render(<ShipmentEditor />);
    const selects = container.querySelectorAll("select");
    const select = (label: string, value: string) => { const native = [...selects].find(e => e.getAttribute("aria-labelledby") && document.getElementById(e.getAttribute("aria-labelledby")!)?.textContent?.includes(label)); if (native) fireEvent.change(native, { target: { value } }); else { const control = screen.getByRole("combobox", { name: new RegExp(label) }); const field = control.closest(".field")!; fireEvent.change(field.querySelector("select")!, { target: { value } }); } };
    select("Nhà cung cấp", "supplier"); select("Hàng hóa", "item");
    fireEvent.change(screen.getByLabelText(/Số lượng dự kiến/), { target: { value: "1.125" } });
    fireEvent.change(screen.getByLabelText("Điểm đi"), { target: { value: "Cảng A" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(mock.api).toHaveBeenCalledOnce());
    expect(JSON.parse(mock.api.mock.calls[0][1].body)).toMatchObject({ supplierId: "supplier", origin: "Cảng A", lines: [{ itemId: "item", expectedQuantity: 1.125, uomId: "uom" }] });
    expect(mock.push).toHaveBeenCalledWith("/import-export/shipments/saved/overview");
  });
  it("keeps a failed contract draft and blocks duplicate pending requests", async () => {
    let reject: ((reason: Error) => void) | undefined;
    mock.api.mockImplementation(() => new Promise((_resolve, failure) => { reject = failure; }));
    const { container } = render(<ContractEditor />);
    fireEvent.change(screen.getByLabelText(/Tiền tệ/), { target: { value: "eur" } });
    fireEvent.change(screen.getByLabelText(/Số lượng đặt/), { target: { value: "2.75" } });
    fireEvent.submit(container.querySelector("form")!); fireEvent.submit(container.querySelector("form")!);
    expect(mock.api).toHaveBeenCalledOnce();
    reject?.(new Error("Mất kết nối")); await screen.findByText("Mất kết nối");
    expect(screen.getByLabelText(/Tiền tệ/)).toHaveValue("EUR");
    expect(screen.getByLabelText(/Số lượng đặt/)).toHaveValue(2.75);
    expect(mock.push).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu hợp đồng" })).toBeEnabled());
  });
});
