import { mkdir } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";
import { chromium } from "playwright-core";

nextEnv.loadEnvConfig(process.cwd());

const baseUrl = process.env.UI_QA_BASE_URL || "http://localhost:3000";
const browserPath = process.env.UI_QA_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const password = process.env.SEED_TEST_PASSWORD || "12345678";
const projectId = process.env.UI_QA_PROJECT_ID || "b0000000-0000-4000-8000-000000000001";
const output = path.join(process.cwd(), "docs", "ui-evidence");
const viewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 }
];
const scenarios = [
  {
    key: "supervisor",
    username: "test.supervisor",
    profileLabel: "Giám sát",
    route: `/projects/${projectId}/progress`,
    forbiddenApps: ["Kho", "Xuất nhập khẩu", "Kế toán", "Quản trị"]
  },
  {
    key: "employee",
    username: "test.employee",
    profileLabel: "Nhân viên",
    route: "/attendance/me",
    forbiddenApps: ["Kho", "Xuất nhập khẩu", "Kế toán", "Quản trị"]
  },
  {
    key: "accounting",
    username: "test.payroll",
    profileLabel: "Kế toán",
    route: "/accounting/payroll",
    forbiddenApps: ["Kho", "Xuất nhập khẩu", "Quản trị"]
  }
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: browserPath, headless: true });

try {
  for (const scenario of scenarios) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, locale: "vi-VN" });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
      await page.locator('[name="username"]').fill(scenario.username);
      await page.locator('[name="password"]').fill(password);
      await Promise.all([
        page.waitForURL(/\/dashboard(?:$|\?)/, { timeout: 20_000 }),
        page.getByRole("button", { name: /Đăng nhập/i }).click()
      ]);

      await page.locator(".dashboard-heading").waitFor({ state: "visible", timeout: 20_000 });
      const dashboardAudit = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        bottomNavigation: document.querySelectorAll(".mobile-bottom-nav").length,
        loadingSpinner: document.querySelectorAll(".state-box__spinner").length,
        profileText: document.querySelector(".dashboard-date-card")?.textContent ?? ""
      }));
      if (dashboardAudit.content > dashboardAudit.viewport) throw new Error(`${scenario.key} dashboard tràn ngang tại ${viewport.width}px`);
      if (dashboardAudit.bottomNavigation) throw new Error(`${scenario.key} còn global bottom navigation`);
      if (dashboardAudit.loadingSpinner) throw new Error(`${scenario.key} còn spinner loading toàn trang`);
      if (!dashboardAudit.profileText.includes(scenario.profileLabel)) throw new Error(`${scenario.key} sai dashboard context: ${dashboardAudit.profileText}`);

      const launcher = page.getByRole("button", { name: "Mở Ứng dụng của tôi" }).first();
      const launcherBox = await launcher.boundingBox();
      if (!launcherBox || launcherBox.width < 44 || launcherBox.height < 44) throw new Error(`${scenario.key} launcher dưới 44px tại ${viewport.width}px`);
      await launcher.click();
      const drawer = page.getByRole("dialog", { name: "Ứng dụng của tôi" });
      await drawer.waitFor({ state: "visible" });
      const appLabels = (await drawer.getByRole("link").allTextContents()).map((label) => label.trim());
      for (const forbidden of scenario.forbiddenApps) {
        if (appLabels.includes(forbidden)) throw new Error(`${scenario.key} thấy ứng dụng không có quyền: ${forbidden}`);
      }
      await drawer.getByRole("button", { name: "Đóng" }).click();

      await page.goto(`${baseUrl}${scenario.route}`, { waitUntil: "networkidle" });
      const routeAudit = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        bottomNavigation: document.querySelectorAll(".mobile-bottom-nav").length
      }));
      if (routeAudit.content > routeAudit.viewport) throw new Error(`${scenario.key} ${scenario.route} tràn ngang tại ${viewport.width}px`);
      if (routeAudit.bottomNavigation) throw new Error(`${scenario.key} ${scenario.route} còn global bottom navigation`);

      const contextLinks = page.locator(".mobile-context-nav__item:visible, [aria-label='Không gian làm việc gói'] a:visible");
      const touchHeights = await contextLinks.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
      if (touchHeights.some((height) => height < 44)) throw new Error(`${scenario.key} context tab dưới 44px: ${touchHeights.join(",")}`);

      if (viewport.width === 390) {
        await page.screenshot({ path: path.join(output, `mobile-role-${scenario.key}-390x844.png`), fullPage: true });
      }
      console.log(`PASS ${scenario.key} ${viewport.width}x${viewport.height}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
