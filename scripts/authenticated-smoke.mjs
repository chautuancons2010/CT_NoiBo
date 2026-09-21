import nextEnv from "@next/env";
import { chromium } from "playwright-core";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const browserPath = process.env.UI_QA_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = process.env.SEED_TEST_PASSWORD || "12345678";
const scenarios = [
  {
    username: "test.supervisor",
    routes: [
      ["/dashboard", "Nguyễn Minh Giám Sát"], ["/employees", "Nhân viên"],
      ["/employees/90000000-0000-4000-8000-000000000001/projects", "Bảo trì hệ thống ray Cảng ABC"],
      ["/projects", "Bảo trì hệ thống ray Cảng ABC"],
      ["/projects/b0000000-0000-4000-8000-000000000001/team", "Nhân sự"],
      ["/worker-attendance", "Điểm danh"], ["/notifications", "Thông báo"]
    ],
    apis: [
      "/api/v1/dashboard", "/api/v1/employees", "/api/v1/employees/90000000-0000-4000-8000-000000000002",
      "/api/v1/projects", "/api/v1/projects/b0000000-0000-4000-8000-000000000001",
      "/api/v1/worker-attendance/today", "/api/v1/notifications"
    ],
    deniedApis: ["/api/v1/attendance/records?employeeId=90000000-0000-4000-8000-000000000002"]
  },
  {
    username: "test.employee",
    routes: [
      ["/dashboard", "Trần Thu Nhân Viên"], ["/attendance/me", "Chấm công"], ["/timesheets", "Kỳ công"],
      ["/leave", "Nghỉ phép"], ["/profile", "Cá nhân"], ["/notifications", "Thông báo"]
    ],
    apis: [
      "/api/v1/dashboard", "/api/v1/attendance/dashboard", "/api/v1/attendance/history",
      "/api/v1/timesheet-periods", "/api/v1/leave-requests?scope=self", "/api/v1/notifications"
    ],
    deniedApis: ["/api/v1/employees", "/api/v1/projects"]
  }
];

const browser = await chromium.launch({ executablePath: browserPath, headless: true });
let failed = false;
try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error.message}`));
    page.on("response", (response) => { if (response.status() >= 500) runtimeErrors.push(`http:${response.status()}:${new URL(response.url()).pathname}`); });
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await page.locator('[name="username"]').fill(scenario.username);
    await page.locator('[name="password"]').fill(password);
    await Promise.all([page.waitForURL(/\/dashboard(?:$|\?)/, { timeout: 20_000 }), page.getByRole("button", { name: "Đăng nhập" }).click()]);
    console.log(`PASS login ${scenario.username}`);

    for (const [route, expectedText] of scenario.routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      await page.getByText(expectedText, { exact: false }).first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
      const body = await page.locator("body").innerText();
      const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      if (!response || response.status() >= 400) throw new Error(`${scenario.username} ${route} HTTP ${response?.status()}`);
      if (!body.includes(expectedText)) throw new Error(`${scenario.username} ${route} thiếu nội dung ${expectedText}`);
      if (body.includes("Bạn cần đăng nhập để tiếp tục")) throw new Error(`${scenario.username} ${route} mất phiên`);
      if (layout.content > layout.viewport) throw new Error(`${scenario.username} ${route} tràn ngang ${layout.content}/${layout.viewport}`);
      console.log(`PASS page ${scenario.username} ${route}`);
    }
    for (const route of scenario.apis) {
      const response = await page.request.get(`${baseUrl}${route}`);
      const body = await response.text();
      if (!response.ok()) throw new Error(`${scenario.username} ${route} HTTP ${response.status()} ${body.slice(0, 180)}`);
      if (!("data" in JSON.parse(body))) throw new Error(`${scenario.username} ${route} thiếu data envelope`);
      console.log(`PASS api ${scenario.username} ${route}`);
    }
    for (const route of scenario.deniedApis) {
      const response = await page.request.get(`${baseUrl}${route}`);
      if (response.status() !== 403) throw new Error(`${scenario.username} ${route} phải trả 403, thực tế ${response.status()}`);
      console.log(`PASS denied ${scenario.username} ${route}`);
    }
    if (runtimeErrors.length) throw new Error(`${scenario.username} runtime errors: ${runtimeErrors.join(", ")}`);
    await context.close();
  }

  const overlayContext = await browser.newContext({ viewport: { width: 1033, height: 243 }, locale: "vi-VN" });
  const overlayPage = await overlayContext.newPage();
  await overlayPage.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await overlayPage.locator('[name="username"]').fill("test.payroll");
  await overlayPage.locator('[name="password"]').fill(password);
  await Promise.all([overlayPage.waitForURL(/\/dashboard(?:$|\?)/, { timeout: 20_000 }), overlayPage.getByRole("button", { name: "Đăng nhập" }).click()]);
  const payrollResponse = await overlayPage.goto(`${baseUrl}/accounting/payroll/98400000-0000-4000-8000-000000000001`, { waitUntil: "networkidle" });
  if (!payrollResponse || payrollResponse.status() >= 400) throw new Error(`payroll detail HTTP ${payrollResponse?.status()}`);
  const payrollApi = await overlayPage.request.get(`${baseUrl}/api/v1/accounting/payroll/98400000-0000-4000-8000-000000000001`);
  if (!payrollApi.ok()) throw new Error(`payroll detail API HTTP ${payrollApi.status()} ${await payrollApi.text()}`);
  await overlayPage.locator(".data-table tbody .data-table__actions").first().waitFor({ state: "visible", timeout: 15_000 });
  const overlap = await overlayPage.evaluate(() => {
    const action = document.querySelector(".data-table tbody .data-table__actions")?.getBoundingClientRect();
    const launcher = document.querySelector(".chat-dock-launcher")?.getBoundingClientRect();
    if (!action || !launcher) return { verified: false, overlap: false };
    return {
      verified: true,
      overlap: action.left < launcher.right && action.right > launcher.left && action.top < launcher.bottom && action.bottom > launcher.top
    };
  });
  if (!overlap.verified || overlap.overlap) throw new Error(`chat launcher che thao tác bảng lương tại 1033x243: ${JSON.stringify(overlap)}`);
  console.log("PASS fixed chat launcher does not cover payroll actions at 1033x243");
  await overlayContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "vi-VN" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('[name="username"]').fill("test.employee");
  await page.locator('[name="password"]').fill(password);
  await Promise.all([page.waitForURL(/\/dashboard(?:$|\?)/, { timeout: 20_000 }), page.getByRole("button", { name: "Đăng nhập" }).click()]);
  for (const route of ["/dashboard", "/attendance/me", "/leave", "/profile"]) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    if (layout.content > layout.viewport) throw new Error(`mobile ${route} tràn ngang ${layout.content}/${layout.viewport}`);
    console.log(`PASS mobile ${route}`);
  }
  await context.close();
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.stack : String(error));
} finally {
  await browser.close();
}
if (failed) process.exit(1);
