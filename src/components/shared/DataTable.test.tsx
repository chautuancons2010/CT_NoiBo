import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";

interface Row {
  code: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { id: "code", header: "Mã", accessor: "code" },
  { id: "name", header: "Tên", accessor: "name" }
];

describe("DataTable", () => {
  it("renders empty state instead of a blank page", () => {
    render(<DataTable columns={columns} data={[]} emptyTitle="Chưa có nhân viên" />);

    expect(screen.getByText("Chưa có nhân viên")).toBeInTheDocument();
  });

  it("renders desktop table content for records", () => {
    render(<DataTable ariaLabel="Danh sách nhân viên" columns={columns} data={[{ code: "NV001", name: "Nguyễn Văn A" }]} />);

    expect(screen.getByRole("table", { name: "Danh sách nhân viên" })).toBeInTheDocument();
    expect(screen.getAllByText("NV001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nguyễn Văn A").length).toBeGreaterThan(0);
  });

  it("marks a selected business row for visual treatment", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={[{ code: "NV001", name: "Nguyễn Văn A" }]}
        getRowId={(row) => row.code}
        onSelectRow={() => undefined}
        selectedRowIds={new Set(["NV001"])}
      />
    );

    expect(container.querySelector("tbody tr")).toHaveClass("is-selected");
  });

  it("selects on one click and exposes double-click and Enter navigation", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={[{ code: "NV001", name: "Nguyễn Văn A" }]}
        getRowId={(row) => row.code}
        rowHrefPrefix="/employees/"
        rowHrefSuffix="/profile"
      />
    );

    const row = container.querySelector<HTMLTableRowElement>("tbody tr");
    expect(row).toHaveAttribute("tabindex", "0");
    expect(container.querySelector<HTMLAnchorElement>(".data-table__row-link")).toHaveAttribute("href", "/employees/NV001/profile");

    fireEvent.click(row!);
    expect(row).toHaveClass("is-selected");
    expect(row).toHaveAttribute("aria-selected", "true");
  });
});
