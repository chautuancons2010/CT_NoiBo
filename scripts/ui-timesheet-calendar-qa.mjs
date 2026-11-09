import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = process.env.UI_QA_BASE_URL || "http://localhost:3100";
const browserPath = process.env.UI_QA_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const output = path.join(process.cwd(), "docs", "ui-evidence", "modern-rounded");
const statuses = [
  "full_work", "full_work", "late", "full_work", "full_work", "full_work", "full_work",
  "full_work", "absent", "full_work", "rest_day", "rest_day", "annual_leave", "full_work",
  "early_leave", "full_work", "full_work", "full_work", "full_work", "missing_check_out",
  "full_work", "full_work", "rest_day", "rest_day", "full_work", "full_work", "needs_review",
  "business_trip", "full_work", "unpaid_leave", "full_work"
];
const period = {
  id: "preview-oct-2026", code: "2026-10", name: "Kỳ công tháng 10/2026",
  startDate: "2026-10-01", endDate: "2026-10-31", status: "open", version: 1, rowVersion: 1
};
const summary = {
  id: "summary-nv001", periodId: period.id, employeeId: "employee-1", employeeCode: "NV001",
  employeeName: "Nguyễn Minh Anh", departmentName: "Nhân sự", positionName: "Chuyên viên",
  employmentTypeName: "Toàn thời gian", scheduledWorkdays: 22, actualWorkdays: 20,
  workedMinutes: 9600, lateDays: 1, lateMinutes: 12, earlyLeaveDays: 1, earlyLeaveMinutes: 25,
  annualLeaveDays: 1, unpaidLeaveDays: 1, absentDays: 1, businessTripDays: 1, holidayDays: 0,
  missingCheckInDays: 0, missingCheckOutDays: 1, exceptionCount: 2
};
const daily = statuses.map((status, index) => {
  const day = index + 1;
  return {
    id: `daily-${day}`, periodId: period.id, employeeId: summary.employeeId, employeeCode: summary.employeeCode,
    employeeName: summary.employeeName, departmentName: summary.departmentName, positionName: summary.positionName,
    employmentTypeName: summary.employmentTypeName, workDate: `2026-10-${String(day).padStart(2, "0")}`,
    shiftId: "shift-1", shiftName: "Hành chính", shiftStart: "08:00", shiftEnd: "17:00",
    sources: ["SELF_ATTENDANCE"], effectiveCheckIn: `2026-10-${String(day).padStart(2, "0")}T01:00:00.000Z`,
    effectiveCheckOut: `2026-10-${String(day).padStart(2, "0")}T10:00:00.000Z`, workMinutes: 480,
    workFraction: status === "full_work" || status === "late" || status === "early_leave" ? 1 : 0,
    leaveFraction: status === "annual_leave" || status === "unpaid_leave" ? 1 : 0,
    lateMinutes: status === "late" ? 12 : 0, earlyLeaveMinutes: status === "early_leave" ? 25 : 0,
    status, hrNote: status === "needs_review" ? "Thiếu xác nhận" : undefined,
    exceptionCount: status === "needs_review" || status === "missing_check_out" ? 1 : 0,
    rawSource: {}, adjustments: [], calculationVersion: 1
  };
});

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: browserPath, headless: true });

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, locale: "vi-VN" });
    await page.route(`**/api/v1/timesheet-periods/${period.id}`, (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { period, daily, summaries: [summary] } })
    }));
    await page.goto(`${baseUrl}/ui-preview/timesheets/employee`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Lịch công" }).waitFor({ timeout: 10000 });
    await page.evaluate(() => {
      const main = document.querySelector(".page-main");
      const shell = document.createElement("div");
      shell.className = "app-shell";
      main?.parentNode?.insertBefore(shell, main);
      if (main) shell.append(main);
    });

    const audit = await page.evaluate(() => {
      const heading = [...document.querySelectorAll("h2")].find((element) => element.textContent?.trim() === "Lịch công");
      const calendar = heading?.closest("section");
      const grid = calendar?.querySelector('[class*="calendarGrid"]');
      const gridStyle = grid ? getComputedStyle(grid) : undefined;
      const days = grid ? [...grid.querySelectorAll("button")] : [];
      const widths = days.map((day) => day.getBoundingClientRect().width);
      const calendarStyle = calendar ? getComputedStyle(calendar) : undefined;
      return {
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        calendarContentWidth: calendar ? calendar.getBoundingClientRect().width - Number.parseFloat(calendarStyle?.paddingLeft ?? "0") - Number.parseFloat(calendarStyle?.paddingRight ?? "0") : 0,
        gridWidth: grid?.getBoundingClientRect().width ?? 0,
        columns: gridStyle?.gridTemplateColumns.split(" ").length ?? 0,
        gap: gridStyle?.gap ?? "",
        dayCount: days.length,
        minDayWidth: Math.min(...widths),
        maxDayWidth: Math.max(...widths),
        heading: heading?.textContent?.trim() ?? ""
      };
    });

    assert.ok(audit.document <= audit.viewport + 1, `Calendar overflow at ${viewport.width}px: ${JSON.stringify(audit)}`);
    assert.equal(audit.heading, "Lịch công");
    assert.equal(audit.columns, 7, `Calendar must keep seven weekday columns: ${JSON.stringify(audit)}`);
    assert.equal(audit.dayCount, 31, `Calendar must show every day of the period: ${JSON.stringify(audit)}`);
    assert.equal(audit.gap, "0px", `Calendar cells must form a continuous grid: ${JSON.stringify(audit)}`);
    assert.ok(Math.abs(audit.maxDayWidth - audit.minDayWidth) < 1, `Calendar columns are uneven: ${JSON.stringify(audit)}`);
    assert.ok(Math.abs(audit.calendarContentWidth - audit.gridWidth) <= 2, `Calendar grid does not fill its surface: ${JSON.stringify(audit)}`);
    await page.screenshot({ path: path.join(output, `employee-timesheet-${viewport.width}.png`), fullPage: true });
    console.log(`PASS employee timesheet calendar ${viewport.width}px - seven continuous columns, all 31 dates, no overflow`);
    await page.close();
  }
} finally {
  await browser.close();
}
