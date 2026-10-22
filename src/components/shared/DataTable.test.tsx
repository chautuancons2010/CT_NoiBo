import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";

interface Row {
  code: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { id: "code", header: "Mã", accessor: "code" },
  { id: "name", header: "Tên", accessor: "name" }
];

afterEach(() => vi.unstubAllGlobals());

describe("DataTable", () => {
  it("keeps table headers visible with an empty state", () => {
    render(<DataTable ariaLabel="Danh sách nhân viên" columns={columns} data={[]} emptyTitle="Chưa có nhân viên" />);

    expect(screen.getByRole("table", { name: "Danh sách nhân viên" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Mã" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tên" })).toBeInTheDocument();
    expect(screen.getAllByText("Chưa có nhân viên")).toHaveLength(1);
  });

  it("renders desktop table content for records", () => {
    render(<DataTable ariaLabel="Danh sách nhân viên" columns={columns} data={[{ code: "NV001", name: "Nguyễn Văn A" }]} />);

    expect(screen.getByRole("table", { name: "Danh sách nhân viên" })).toBeInTheDocument();
    expect(screen.getAllByText("NV001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nguyễn Văn A").length).toBeGreaterThan(0);
  });

  it("builds a phone record with a clear identity and a full-width open action", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(max-width: 767px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { container } = render(
      <DataTable
        columns={columns}
        data={[{ code: "NV001", name: "Nguyễn Văn A" }]}
        getRowId={(row) => row.code}
        rowHrefPrefix="/employees/"
        rowHrefSuffix="/profile"
      />
    );

    expect(container.querySelector(".mobile-record__eyebrow")).toHaveTextContent("MãNV001");
    expect(container.querySelector(".mobile-record__title")).toHaveTextContent("Nguyễn Văn A");
    expect(container.querySelector(".mobile-record__open")).toHaveAttribute("href", "/employees/NV001/profile");
    expect(container.querySelector("table")).toBeNull();
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

  it("sorts sortable columns and announces the direction", () => {
    const sortableColumns: DataTableColumn<Row>[] = [
      { id: "code", header: "Mã", accessor: "code", sortable: true },
      columns[1]
    ];
    render(<DataTable columns={sortableColumns} data={[{ code: "NV010", name: "B" }, { code: "NV002", name: "A" }]} />);

    const sortButton = screen.getByRole("button", { name: /Mã/ });
    fireEvent.click(sortButton);
    expect(screen.getByRole("columnheader", { name: /Mã/ })).toHaveAttribute("aria-sort", "ascending");
    expect(within(screen.getAllByRole("row")[1]).getByText("NV002")).toBeInTheDocument();

    fireEvent.click(sortButton);
    expect(screen.getByRole("columnheader", { name: /Mã/ })).toHaveAttribute("aria-sort", "descending");
    expect(within(screen.getAllByRole("row")[1]).getByText("NV010")).toBeInTheDocument();
  });

  it("opens a focused row with Enter without hijacking controls inside it", () => {
    const { container } = render(<DataTable actions={() => <button type="button">Modifier</button>} columns={columns} data={[{ code: "NV001", name: "A" }]} getRowId={(row) => row.code} rowHrefPrefix="/employees/" />);
    const row = container.querySelector<HTMLTableRowElement>("tbody tr")!;
    const link = container.querySelector<HTMLAnchorElement>(".data-table__row-link")!;
    const open = vi.spyOn(link, "click").mockImplementation(() => undefined);

    fireEvent.keyDown(screen.getByRole("button", { name: "Modifier" }), { key: "Enter" });
    fireEvent.keyDown(link, { key: "Enter" });
    expect(open).not.toHaveBeenCalled();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(open).toHaveBeenCalledOnce();
  });
});
