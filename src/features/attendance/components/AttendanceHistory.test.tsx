import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AttendanceHistory } from "./AttendanceHistory";

afterEach(() => vi.unstubAllGlobals());

describe("personal attendance calendar", () => {
  it("opens a day without check-in or check-out records", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));

    render(<AttendanceHistory selectedDate={undefined} />);

    const today = new Date();
    const firstDay = `01/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    const day = await waitFor(() => screen.getByRole("button", { name: `${firstDay}, chưa có lượt chấm` }));
    fireEvent.click(day);

    expect(screen.getByText("Chưa có lượt chấm công.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("Giờ vào")).not.toBeInTheDocument();
    expect(screen.queryByText("Giờ ra")).not.toBeInTheDocument();
  });

  it("starts with only the calendar and reveals the monthly summary on request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
    render(<AttendanceHistory />);
    await screen.findByText("Tổng kết tháng");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Đủ công")).not.toBeVisible();
    fireEvent.click(screen.getByText("Tổng kết tháng"));
    expect(screen.getByText("Đủ công")).toBeVisible();
  });
});
