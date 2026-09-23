import { mkdir } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";
import { chromium } from "playwright-core";

nextEnv.loadEnvConfig(process.cwd());

const baseUrl = process.env.UI_QA_BASE_URL || "http://localhost:3000";
const projectId = process.env.UI_QA_PROJECT_ID || "b0000000-0000-4000-8000-000000000001";
const edgePath = process.env.UI_QA_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const output = path.join(process.cwd(), "docs", "ui-evidence");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, locale: "vi-VN" });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await page.locator('[name="username"]').fill("test.supervisor");
    await page.locator('[name="password"]').fill(process.env.SEED_TEST_PASSWORD || "12345678");
    await Promise.all([
      page.waitForURL(/\/dashboard/),
      page.getByRole("button", { name: /Đăng nhập/i }).click()
    ]);

    await page.goto(`${baseUrl}/projects/${projectId}/progress`, { waitUntil: "networkidle" });
    const nav = page.getByRole("navigation", { name: "Không gian làm việc gói" });
    const labels = await nav.getByRole("link").allTextContents();
    if (labels.map((value) => value.trim()).join("|") !== "Thi công|Chấm công|Hồ sơ|Tài liệu") throw new Error(`Sai WorkspaceNav: ${labels.join("|")}`);
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      statCards: document.querySelectorAll(".stat-card").length,
      hasConstructionHeading: document.body.innerText.includes("Thi công & Tiến độ"),
      hasFieldUpdate: document.body.innerText.includes("Cập nhật hiện trường")
    }));
    if (layout.content > layout.viewport) throw new Error(`Thi công tràn ngang ${viewport.width}px: ${layout.content}px > ${layout.viewport}px`);
    if (!layout.hasConstructionHeading) throw new Error(`Thiếu nội dung Thi công: ${JSON.stringify(layout)}`);
    if (viewport.width === 390) {
      const sizes = await nav.getByRole("link").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
      if (sizes.some((height) => height < 44)) throw new Error(`Touch target tab dưới 44px: ${sizes.join(",")}`);
    }
    await page.screenshot({ path: path.join(output, `package-workspace-progress-${viewport.width}x${viewport.height}.png`), fullPage: true });

    await page.getByRole("button", { name: "Thông tin gói" }).click();
    if (!await page.getByRole("dialog", { name: "Thông tin gói" }).isVisible()) throw new Error("Drawer Thông tin gói không mở.");
    await page.getByRole("button", { name: "Đóng" }).click();

    await page.goto(`${baseUrl}/projects/${projectId}/team`, { waitUntil: "networkidle" });
    const attendance = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      statCards: document.querySelectorAll(".stat-card").length,
      summary: [...document.querySelectorAll("p")].some((item) => /nhân sự.*chưa xử lý.*Ca/i.test(item.textContent || ""))
    }));
    if (attendance.content > attendance.viewport) throw new Error(`Chấm công tràn ngang ${viewport.width}px`);
    if (attendance.statCards !== 0 || !attendance.summary) throw new Error(`Chấm công còn KPI hoặc thiếu summary: ${JSON.stringify(attendance)}`);
    await page.screenshot({ path: path.join(output, `package-workspace-attendance-${viewport.width}x${viewport.height}.png`), fullPage: true });

    await page.goto(`${baseUrl}/projects/${projectId}/profile`, { waitUntil: "networkidle" });
    const records = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      hasHeading: [...document.querySelectorAll("h2")].some((item) => item.textContent?.trim() === "Hồ sơ"),
      duplicateCustomer: document.body.innerText.includes("Khách hàng")
    }));
    if (records.content > records.viewport || !records.hasHeading || records.duplicateCustomer) throw new Error(`Hồ sơ sai layout/metadata: ${JSON.stringify(records)}`);
    await page.screenshot({ path: path.join(output, `package-workspace-records-${viewport.width}x${viewport.height}.png`), fullPage: true });

    await page.goto(`${baseUrl}/projects/${projectId}/documents`, { waitUntil: "networkidle" });
    const documents = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      search: Boolean(document.querySelector('input[type="search"]')),
      filter: Boolean(document.querySelector("select"))
    }));
    if (documents.content > documents.viewport || !documents.search || !documents.filter) throw new Error(`Tài liệu sai workspace: ${JSON.stringify(documents)}`);
    await page.screenshot({ path: path.join(output, `package-workspace-documents-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await context.close();
    console.log(`PASS package workspace ${viewport.width}x${viewport.height}`);
  }
} finally {
  await browser.close();
}
