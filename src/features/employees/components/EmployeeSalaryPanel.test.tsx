import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SalaryRecord } from "@/features/accounting/types";
import { EmployeeSalaryPanel } from "./EmployeeSalaryPanel";

const latest: SalaryRecord = { id: "new", employeeId: "person", employeeCode: "NV018", employeeName: "Nhân viên", baseSalary: 12800000, allowance: 725000, bonus: 300000, deduction: 250000, effectiveDate: "2026-07-01", note: "Ghi chú hồ sơ được giữ nguyên", reason: "Điều chỉnh phụ cấp", changedAt: "2026-07-01T01:00:00Z", changedByName: "Kế toán" };
const previous: SalaryRecord = { ...latest, id: "old", baseSalary: 11500000, effectiveDate: "2026-01-01", reason: "Bản ghi cũ riêng tư", note: "Ghi chú cũ" };

describe("employee salary presentation", () => {
  it("shows the stored salary components and effective date without presenting a calculated payroll total", () => {
    render(<EmployeeSalaryPanel canViewHistory history={[latest,previous]} />);
    expect(screen.getAllByText(/12\.800\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/725\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("01/07/2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText(latest.note!).length).toBeGreaterThan(0);
    expect(screen.queryByText("Thực nhận")).not.toBeInTheDocument();
    expect(screen.queryByText("Tổng thu nhập")).not.toBeInTheDocument();
  });

  it("does not put prior salary records in the rendered page without history permission", () => {
    render(<EmployeeSalaryPanel canViewHistory={false} history={[latest,previous]} />);
    expect(screen.queryByRole("complementary", { name: "Lịch sử lương" })).not.toBeInTheDocument();
    expect(screen.queryByText(previous.reason)).not.toBeInTheDocument();
    expect(screen.queryByText(/11\.500\.000/)).not.toBeInTheDocument();
  });

  it("keeps zero amounts visible as zero rather than missing data", () => {
    render(<EmployeeSalaryPanel canViewHistory={false} history={[{ ...latest, baseSalary: 0, allowance: 0, bonus: 0, deduction: 0, note: undefined }]} />);
    expect(screen.getAllByText(/^0\s*₫$/)).toHaveLength(4);
    expect(screen.queryByText("Chưa có")).not.toBeInTheDocument();
  });

  it("distinguishes an allowance-only change without suggesting the base salary changed", () => {
    render(<EmployeeSalaryPanel canViewHistory history={[latest,{ ...previous, baseSalary: latest.baseSalary, allowance: 500000 }]} />);
    const history = screen.getByRole("complementary", { name: "Lịch sử lương" });
    const changed = within(history).getByRole("list", { name: "Thành phần thay đổi" });
    expect(within(changed).getByText("Phụ cấp")).toBeInTheDocument();
    expect(within(history).queryByText("Trước:")).not.toBeInTheDocument();
    const detail = within(history).getAllByText("Chi tiết mức lương", { selector: "summary" })[0];
    fireEvent.click(detail);
    expect(detail.closest("details")).toHaveAttribute("open");
  });

  it("shows an empty state for a missing salary record", () => {
    render(<EmployeeSalaryPanel canViewHistory history={[]} />);
    expect(screen.getByText("Chưa có hồ sơ lương")).toBeInTheDocument();
    expect(screen.queryByText("Lương cơ bản")).not.toBeInTheDocument();
  });
});
