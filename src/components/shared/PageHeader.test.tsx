import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/shared/PageHeader";

describe("PageHeader", () => {
  it("renders the route title exactly once as h1", () => {
    render(<PageHeader title="Quản lý xuất nhập khẩu" />);
    expect(screen.getAllByText("Quản lý xuất nhập khẩu")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Quản lý xuất nhập khẩu" })).toBeInTheDocument();
  });
});
