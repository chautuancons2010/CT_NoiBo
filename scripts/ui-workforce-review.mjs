import assert from "node:assert/strict";
import { observePage } from "./e2e/page-ready.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { loadTestConfiguration } from "./testing/config.mjs";
import { createTesterToken, TEST_GATE_COOKIE } from "../src/lib/testing/policy.mjs";

const { env } = await loadTestConfiguration();
const base = process.env.UI_QA_BASE_URL || "http://localhost:3300";
assert(["localhost", "127.0.0.1", "ct-noi-bo-test-chau-tuan.vercel.app"].includes(new URL(base).hostname), "UI review is TEST-only");
const output = "test-results/workforce-review-20261112";
await mkdir(output, { recursive: true });
const report = { at: new Date().toISOString(), base, screens: [], checks: [], failures: [], runtimeErrors: [], businessWrites: [] };
const browser = await chromium.launch({ executablePath: process.env.UI_QA_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const routes = ["/dashboard", "/personal", "/employees", "/employees/new", "/employees/departments", "/employees/positions", "/employees/contracts", "/employees/insurance", "/attendance/today", "/attendance/history", "/attendance/requests", "/timesheets", "/timesheets/matrix", "/timesheets/adjustments", "/leave", "/leave/manage", "/settings/attendance", "/settings/attendance/shifts", "/settings/attendance/locations", "/settings/attendance/policies", "/settings/users", "/settings/roles", "/projects", "/projects/new", "/worker-attendance/today", "/warehouse/inventory", "/warehouse/receipts", "/warehouse/items", "/import-export/shipments", "/accounting/salaries", "/accounting/payroll", "/accounting/payslips", "/messages", "/approvals", "/documents", "/reports", "/system-admin", "/system-admin/modules", "/system-admin/appearance", "/system-admin/organization", "/system-admin/branding", "/profile", "/notifications"];
const screenshots = new Set(["/personal", "/employees", "/employees/new", "/attendance/today", "/timesheets/matrix", "/worker-attendance/today", "/system-admin/modules", "/warehouse/inventory", "/accounting/payroll"]);

async function session(username) {
  const context = await browser.newContext({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  await context.addCookies([{ name: TEST_GATE_COOKIE, value: createTesterToken(env, Date.now() - 60_000), url: base, httpOnly: true, sameSite: "Lax" }]);
  const login = await context.request.post(base + "/api/testing/login", { headers: { origin: base }, data: { username }, timeout: 45000 });
  assert(login.ok(), `TEST login ${username}: ${login.status()}`);
  await context.route("**/api/**", route => {
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.continue();
    report.businessWrites.push({ method: route.request().method(), path: new URL(route.request().url()).pathname });
    return route.abort();
  });
  const page = await context.newPage();
  page.workforceReadiness = observePage(page);
  page.on("pageerror", error => report.runtimeErrors.push({ url: page.url(), message: error.message }));
  return { context, page };
}
async function screen(page, actor, route, width, capture = false) {
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
  const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("main").waitFor({ timeout: 45000 });
  await page.waitForFunction(() => Boolean(document.querySelector("main h1, main h2")), { timeout: 30000 });
  await page.workforceReadiness.ready();
  await page.waitForTimeout(350);
  const layout = await page.evaluate(() => {
    const main = document.querySelector("main");
    const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
    const overflow = [...main.querySelectorAll("button, input, [role=combobox], h1")].filter(el => visible(el) && !el.closest(".table-scroll, [hidden], [inert]"))
      .filter(el => { const box = el.getBoundingClientRect(); if (box.left >= -1 && box.right <= innerWidth + 1) return false; let parent = el.parentElement; while(parent && parent !== main) { const css = getComputedStyle(parent); if (["auto","scroll","hidden","clip"].includes(css.overflowX)) { const clip = parent.getBoundingClientRect(); if (clip.left >= -1 && clip.right <= innerWidth + 1) return false; } parent = parent.parentElement; } return true; })
      .map(el => ({ tag: el.tagName, name: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 70) }));
    return { width: innerWidth, contentWidth: document.documentElement.scrollWidth, titleCount: [...main.querySelectorAll("h1")].filter(visible).length, overflow };
  });
  const item = { actor, route, width, status: response?.status(), finalPath: new URL(page.url()).pathname, ...layout };
  report.screens.push(item);
  const rootWithoutTitle = width < 768 && ["/dashboard", "/personal"].includes(route) && layout.titleCount === 0;
  if (!response?.ok() || layout.contentWidth > width + 1 || (!rootWithoutTitle && layout.titleCount !== 1) || layout.overflow.length) report.failures.push(item);
  if (capture) await page.screenshot({ path: `${output}/${actor}-${route.replaceAll("/", "_")}-${width}.png`, fullPage: false });
  console.log(`${report.failures.includes(item) ? "FAIL" : "PASS"} ${actor} ${width} ${route}`);
}
try {
  const admin = await session("admin.test");
  for (const width of [1440, 390]) {
    for (const route of routes) await screen(admin.page, "admin", route, width, screenshots.has(route));
  }
  await screen(admin.page, "admin", "/attendance/today", 390);
  await admin.page.getByRole("tab", { name: "Điểm danh công trường" }).click();
  await admin.page.getByRole("tab", { name: "\u0110i\u1ec3m danh c\u00f4ng tr\u01b0\u1eddng" }).getAttribute("aria-selected").then(value => assert.equal(value,"true"));
  await admin.page.workforceReadiness.ready();
  assert.equal(await admin.page.getByRole("button", { name: "Xuất bảng công", exact: true }).count(), 1);
  assert.equal(await admin.page.getByRole("textbox", { name: "Tháng xuất bảng công" }).count(), 0);
  await admin.page.screenshot({ path: `${output}/admin-field-review-390.png` });
  await admin.page.getByRole("button", { name: "Xuất bảng công", exact: true }).click();
  await admin.page.getByRole("dialog", { name: "Xuất bảng công" }).waitFor();
  await admin.page.screenshot({ path: `${output}/export-sheet-390.png` });
  await admin.page.keyboard.press("Escape");
  report.checks.push("One export action, month is disclosed only in the export dialog");
  await admin.context.close();

  const hr = await session("hr.test");
  for (const width of [320, 390, 430]) {
    for (const route of ["/employees", "/personal", "/attendance/today", "/timesheets/matrix"]) await screen(hr.page, "hr", route, width, true);
    await hr.page.getByRole("button", { name: "Mở Ứng dụng của tôi", exact: true }).click();
    const sheet = hr.page.getByRole("dialog", { name: "Ứng dụng của tôi" });
    await sheet.waitFor();
    const box = await sheet.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width + 1, "App sheet overflows phone");
    assert(await sheet.getByRole("link", { name: "Nhân sự", exact: true }).count());
    assert(await sheet.getByRole("link", { name: "Cá nhân", exact: true }).count());

    await hr.page.screenshot({ path: `${output}/hr-app-sheet-${width}.png` });
    await hr.page.keyboard.press("Escape");
  }
  for (const route of ["/warehouse", "/accounting", "/projects", "/system-admin", "/messages"]) {
    await hr.page.goto(base + route, { waitUntil: "domcontentloaded" });
    assert.notEqual(new URL(hr.page.url()).pathname, "/module-locked", `HR must reach normal authorization for ${route}`);
  }
  report.checks.push("HR reaches existing business authorization without additional role/module locks");
  await hr.context.close();
  const supervisor = await session("engineer.test");
  for (const width of [320, 390, 430]) {
    for (const route of ["/personal", "/worker-attendance/today", "/attendance/history"]) await screen(supervisor.page, "supervisor", route, width, true);
  }
  await supervisor.context.close();
} catch (error) {
  report.failures.push({ message: error.message });
  console.error(error.message);
} finally {
  await browser.close();
  await writeFile(`${output}/ui-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ screens: report.screens.length, failures: report.failures.length, runtimeErrors: report.runtimeErrors.length, businessWrites: report.businessWrites.length }));
  if (report.failures.length || report.runtimeErrors.length || report.businessWrites.length) process.exitCode = 1;
}
