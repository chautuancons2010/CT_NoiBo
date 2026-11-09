import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WarehouseDocumentFilters, emptyDocumentCriteria } from "./WarehouseDocumentFilters";

const stores = [{ value: "store-1", label: "K01 · Kho chính" }];
describe("warehouse document filters", () => {
  it("keeps typing local and applies the trimmed search only when submitted", () => {
    const apply = vi.fn();
    render(<WarehouseDocumentFilters criteria={emptyDocumentCriteria} onApply={apply} search="" warehouses={stores} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm chứng từ kho" }), { target: { value: "  PN-01  " } });
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
    expect(apply).toHaveBeenCalledExactlyOnceWith(emptyDocumentCriteria, "PN-01");
  });

  it("commits multiple draft criteria once, when Apply is pressed", () => {
    const apply = vi.fn();
    render(<WarehouseDocumentFilters criteria={emptyDocumentCriteria} onApply={apply} search="" warehouses={stores} />);
    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Kho" }));
    fireEvent.click(screen.getByRole("option", { name: "K01 · Kho chính" }));
    fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Đến ngày"), { target: { value: "2026-11-30" } });
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(apply).toHaveBeenCalledExactlyOnceWith({ status: "", warehouseId: "store-1", from: "2026-11-01", to: "2026-11-30" }, "");
  });

  it("removes only the chosen applied criterion and preserves the date range", () => {
    const apply = vi.fn();
    render(<WarehouseDocumentFilters criteria={{ status: "draft", warehouseId: "store-1", from: "2026-11-01", to: "2026-11-30" }} onApply={apply} search="PN" warehouses={stores} />);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ lọc Kho" }));
    expect(apply).toHaveBeenCalledWith({ status: "draft", warehouseId: "", from: "2026-11-01", to: "2026-11-30" }, "PN");
  });

  it("applies a quick status without losing warehouse and dates", () => {
    const apply = vi.fn(),criteria = { ...emptyDocumentCriteria, warehouseId: "store-1", from: "2026-11-01" };
    render(<WarehouseDocumentFilters criteria={criteria} onApply={apply} search="" warehouses={stores} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Trạng thái chứng từ kho" })).getByRole("button", { name: "Chờ ghi sổ" }));
    expect(apply).toHaveBeenCalledWith({ ...criteria, status: "submitted" }, "");
  });

  it("keeps invalid filters open instead of applying them", () => {
    const apply = vi.fn();
    const view = render(<WarehouseDocumentFilters criteria={emptyDocumentCriteria} onApply={apply} search="" warehouses={stores} />);
    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc" }));
    vi.spyOn(view.container.querySelector("form")!, "reportValidity").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Bộ lọc" })).toBeInTheDocument();
  });
});
