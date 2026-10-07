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

    const links = screen.getAllByRole("link", { name: employee.fullName });
    expect(links).toHaveLength(1);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/employees?page=2&pageSize=10&selected=employee%2Fid%20with%20spaces");
    }
    expect(screen.queryByRole("columnheader", { name: "Ngày vào làm" })).not.toBeInTheDocument();
    expect(screen.queryByText("NV001")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Họ tên" })).toHaveAttribute("data-priority", "primary");
    expect(screen.getByRole("cell", { name: new RegExp(employee.fullName) })).toHaveAttribute("data-priority", "primary");
  });

  it("shows the saved employee avatar in the roster", () => {
    const employeeWithPhoto = { ...employee, id: "90000000-0000-4000-8000-000000000002", avatarAssetId: "file-id" };
    const { container } = render(<EmployeeListTable employees={[employeeWithPhoto]} permissions={[]} />);

    expect(container.querySelector(".employee-name-with-avatar img")).toHaveAttribute(
      "src",
      `/api/v1/employees/${employeeWithPhoto.id}/avatar?v=0`
    );
  });
});
