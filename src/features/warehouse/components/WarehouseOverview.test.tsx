import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WarehouseDashboard } from "../types/warehouseTypes";
import { WarehouseCreateActions, WarehouseOverview } from "./WarehouseOverview";

const sample: WarehouseDashboard = { itemCount: 2, warehouseCount: 1, totalOnHand: 4, outOfStock: 1, lowStock: 0, pendingDocuments: 1, pendingReceipts: 1, pendingIssues: 0,
  pendingDocumentItems: [{ id: "receipt-1", documentNumber: "NK01", type: "receipt", documentDate: "2026-11-09", status: "submitted", transactionTypeCode: "RECEIPT", totalQuantity: 10, targetWarehouseId: "store-1", targetWarehouseName: "Kho chính", lineCount: 1, rowVersion: 1, lines: [] }],
  recentDocuments: [], lowStockItems: [{ warehouseId: "store-1", warehouseCode: "K01", updatedAt: "2026-11-09", warehouseName: "Kho chính", itemId: "item-1", itemCode: "VT01", itemName: "Thép", onHand: 0, uomCode: "kg", minimumStock: 10, status: "out_of_stock" }]
};
vi.mock("../client/useWarehouseResource", () => ({ useWarehouseResource: () => ({ data: sample, reload: vi.fn() }) }));
afterEach(cleanup);

describe("warehouse task workspace", () => {
  it("switches between actual pending documents and stock alerts without showing recent history as active work", () => {
    render(<WarehouseOverview actions={[]} />);
    expect(screen.getByRole("link", { name: /NK01/ })).toHaveAttribute("href", "/warehouse/receipts/receipt-1");
    expect(screen.queryByRole("link", { name: /Thép/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cần bổ sung 1" }));
    expect(screen.getByRole("link", { name: /Thép/ })).toHaveAttribute("href", "/warehouse/inventory?warehouseId=store-1&itemId=item-1");
    expect(screen.queryByRole("link", { name: /NK01/ })).not.toBeInTheDocument();
    expect(screen.getByText("Giao dịch gần đây").closest("details")).not.toHaveAttribute("open");
  });
  it("groups only authorized creation actions in the page command", () => {
    render(<WarehouseCreateActions actions={["issue"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo phiếu kho" }));
    expect(screen.getByRole("menuitem", { name: "Xuất kho" })).toHaveAttribute("href", "/warehouse/issues/new");
    expect(screen.queryByRole("menuitem", { name: "Nhập kho" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Tạo kiểm kê" })).not.toBeInTheDocument();
  });
});
