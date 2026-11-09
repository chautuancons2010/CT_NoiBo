import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterBar, FilterSheet } from "@/components/shared/FilterBar";
import { SearchInput, Select } from "@/components/shared/FormControls";

describe("FilterSheet", () => {
  it("counts a selected criterion while treating the all option as unfiltered", () => {
    const controls = (value: string) => <FilterBar><SearchInput label="Tìm" /><Select label="Trạng thái" value={value} onChange={() => undefined} options={[{ value: "all", label: "Tất cả" }, { value: "active", label: "Hoạt động" }]} /><Select label="Phòng ban" options={[]} /><Select label="Chức vụ" options={[]} /></FilterBar>;
    const view = render(controls("all"));
    expect(screen.getByRole("button", { name: "Bộ lọc" })).toBeInTheDocument();
    view.rerender(controls("active"));
    expect(screen.getByRole("button", { name: "Bộ lọc (1)" })).toBeInTheDocument();
  });
  it("keeps a long desktop filter set in one sheet and submits its values with the list search", () => {
    const submitted = vi.fn();
    const { container } = render(<form onSubmit={(event) => { event.preventDefault(); submitted(Object.fromEntries(new FormData(event.currentTarget))); }}>
      <FilterBar>
        <SearchInput label="Tìm hồ sơ" name="q" defaultValue="Mai" />
        <Select label="Phòng ban" labelHidden name="department" defaultValue="hr" options={[{ label: "Nhân sự", value: "hr" }]} />
        <Select label="Chức vụ" labelHidden name="position" options={[]} />
        <Select label="Trạng thái" labelHidden name="status" options={[{ label: "Đang làm", value: "active" }]} />
      </FilterBar>
    </form>);
    expect(screen.getByRole("searchbox", { name: "Tìm hồ sơ" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc (1)" }));
    expect(screen.getByText("Phòng ban", { selector: "label" })).not.toHaveClass("sr-only");
    fireEvent.click(screen.getByRole("combobox", { name: "Trạng thái" }));
    fireEvent.click(screen.getByRole("option", { name: "Đang làm" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(submitted).toHaveBeenCalledWith({ q: "Mai", department: "hr", status: "active" });
    expect(new FormData(container.querySelector("form")!).get("status")).toBe("active");
  });

  it("keeps mobile apply and reset actions inside the bottom sheet", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const onReset = vi.fn();

    render(<FilterSheet onApply={onApply} onClose={onClose} onReset={onReset} open><label>Trạng thái<input /></label></FilterSheet>);

    expect(screen.getByRole("dialog", { name: "Bộ lọc" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    expect(onReset).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
