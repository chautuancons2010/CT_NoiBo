import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmployeeListTable } from "@/features/employees/components/EmployeeListTable";
import type { EmployeeSummary } from "@/features/employees/types";

const employee: EmployeeSummary = {
  id: "employee/id with spaces",
  employeeCode: "NV001",
  fullName: "Nguyễn Thị Thúy Hằng",
  displayName: "Thúy Hằng",
  departmentName: "Nhân sự",
  positionName: "Chuyên viên",
  employmentTypeName: "Chính thức",
  workerCategory: "office",
  phone: "0900000000",
  companyEmail: "hang@example.com",
  joinDate: "2026-01-02",
  employmentStatus: "active",
  employmentStatusLabel: "Đang làm việc",
  employmentStatusTone: "success",
  profileStatus: "complete",
  profileCompleteness: 100,
  hasAccount: true
};

describe("EmployeeListTable", () => {
  it("builds selection links from serializable route data", () => {
    render(<EmployeeListTable employees={[employee]} permissions={[]} selectionBaseHref="/employees?page=2&pageSize=10" />);

    const links = screen.getAllByRole("link", { name: "NV001" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/employees?page=2&pageSize=10&selected=employee%2Fid%20with%20spaces");
    }
    expect(screen.getByRole("link", { name: "Mở bản ghi employee/id with spaces" })).toHaveAttribute(
      "href",
      "/employees/employee%2Fid%20with%20spaces/profile"
    );
    expect(screen.queryByRole("columnheader", { name: "Ngày vào làm" })).not.toBeInTheDocument();
  });
});
