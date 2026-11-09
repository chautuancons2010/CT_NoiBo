import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmployeeListFilters } from "@/features/employees/components/EmployeeListFilters";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("EmployeeListFilters", () => {
  beforeEach(() => push.mockClear());

  it("applies selected filters and resets pagination", () => {
    render(<EmployeeListFilters
      defaults={{ page: 3, pageSize: 20 }}
      departments={[]}
      employmentTypes={[]}
      positions={[]}
      statuses={[{ label: "Tạm nghỉ", value: "on_leave" }]}
    />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm nhân viên" }), { target: { value: "An" } });
    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Trạng thái" }));
    fireEvent.click(screen.getByRole("option", { name: "Tạm nghỉ" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(push).toHaveBeenCalledWith("/employees?q=An&status=on_leave&page=1&pageSize=20");
  });

  it("clears all filters", () => {
    render(<EmployeeListFilters defaults={{ pageSize: 10, q: "An" }} departments={[]} employmentTypes={[]} positions={[]} statuses={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(push).toHaveBeenCalledWith("/employees");
  });

  it("removes one applied criterion while preserving search, other filters and page size", () => {
    render(<EmployeeListFilters defaults={{ q: "An", departmentId: "hr", status: "on_leave", page: 4, pageSize: 20 }} departments={[{ label: "Nhân sự", value: "hr" }]} employmentTypes={[]} positions={[]} statuses={[{ label: "Tạm nghỉ", value: "on_leave" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ lọc Trạng thái" }));
    expect(push).toHaveBeenCalledWith("/employees?q=An&departmentId=hr&page=1&pageSize=20");
  });

  it("clears draft criteria in the sheet without navigating until Apply and keeps the search", () => {
    render(<EmployeeListFilters defaults={{ q: "An", status: "on_leave", pageSize: 20 }} departments={[]} employmentTypes={[]} positions={[]} statuses={[{ label: "Tạm nghỉ", value: "on_leave" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Trạng thái" })).toHaveTextContent("Tất cả trạng thái");
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(push).toHaveBeenCalledWith("/employees?q=An&page=1&pageSize=20");
  });

  it("updates form values when navigation supplies new applied defaults", () => {
    const props = { departments: [], employmentTypes: [], positions: [], statuses: [] };
    const view = render(<EmployeeListFilters {...props} defaults={{ q: "An" }} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Đang gõ" } });
    view.rerender(<EmployeeListFilters {...props} defaults={{ q: "Bình" }} />);
    expect(screen.getByRole("searchbox")).toHaveValue("Bình");
  });
});
