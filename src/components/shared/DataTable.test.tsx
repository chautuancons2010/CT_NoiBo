import { render, screen } from "@testing-library/react";
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
    render(<DataTable columns={columns} data={[{ code: "NV001", name: "Nguyễn Văn A" }]} />);

    expect(screen.getAllByText("NV001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nguyễn Văn A").length).toBeGreaterThan(0);
  });
});
