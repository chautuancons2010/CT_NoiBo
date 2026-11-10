import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Link from "next/link";

import { EntityContextHeader, PageHeader, RecordHeader, ResponsivePageHeader } from "@/components/shared/PageHeader";

describe("PageHeader", () => {
  it("keeps record identity, status, editing and section navigation under one main title", () => {
    render(<RecordHeader action={<Link href="/employees/one/edit">Chỉnh sửa hồ sơ</Link>} avatar={<span>TP</span>} code="NV018" meta={<span>Công nhân</span>} navigation={<nav aria-label="Thông tin nhân viên"><Link href="/employees/one/salary">Lương & phúc lợi</Link></nav>} status={<span>Đang làm việc</span>} title="Đặng Thảo Phương" />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByText("Đặng Thảo Phương")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Chỉnh sửa hồ sơ" })).toHaveAttribute("href", "/employees/one/edit");
    expect(screen.getByRole("navigation", { name: "Thông tin nhân viên" })).toBeInTheDocument();
    expect(screen.getByText("NV018")).toBeInTheDocument();
  });

  it("renders the route title exactly once as h1", () => {
    render(<PageHeader title="Quản lý xuất nhập khẩu" />);
    expect(screen.getAllByText("Quản lý xuất nhập khẩu")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Quản lý xuất nhập khẩu" })).toBeInTheDocument();
  });

  it("keeps the canonical responsive name compatible", () => {
    render(<ResponsivePageHeader title="Danh sách nhân viên" />);
    expect(screen.getByRole("heading", { level: 1, name: "Danh sách nhân viên" })).toBeInTheDocument();
  });

  it("composes entity identity, status and actions without duplicating the title", () => {
    render(
      <EntityContextHeader
        action={<button type="button">Thông tin gói</button>}
        code="CT-01"
        meta="Cảng ABC · 12 nhân sự"
        status={<span>Đang thi công</span>}
        title="Bảo trì hệ thống ray"
      />
    );

    expect(screen.getAllByText("Bảo trì hệ thống ray")).toHaveLength(1);
    expect(screen.getByRole("toolbar", { name: "Thao tác đối tượng" })).toBeInTheDocument();
  });
});
