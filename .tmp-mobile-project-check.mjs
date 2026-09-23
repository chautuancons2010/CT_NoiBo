import nextEnv from "@next/env";
import { chromium } from "playwright-core";

nextEnv.loadEnvConfig(process.cwd());
const browser = await chromium.launch({ executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "vi-VN" });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.locator('[name="username"]').fill("test.supervisor");
  await page.locator('[name="password"]').fill(process.env.SEED_TEST_PASSWORD || "12345678");
  await Promise.all([page.waitForURL(/\/dashboard/), page.getByRole("button", { name: /Đăng nhập/i }).click()]);
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle" });
  const result = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    cards: document.querySelectorAll(".project-package-row").length,
    minTap: Math.min(...[...document.querySelectorAll(".project-package-row__open")].map((item) => item.getBoundingClientRect().width))
  }));
  console.log(JSON.stringify(result));
  await page.screenshot({ path: "C:\\Users\\Admin\\CT_NoiBo\\.tmp-mobile-project.png", fullPage: true });
  await page.goto("http://localhost:3000/projects/b0000000-0000-4000-8000-000000000001/team", { waitUntil: "networkidle" });
  const detail = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    firstTab: document.querySelector(".tabs__item")?.textContent?.trim(),
    firstCard: document.querySelector(".project-people-attendance > section, .project-people-attendance > div .card")?.textContent?.trim().slice(0, 60)
  }));
  console.log(JSON.stringify(detail));
  await page.screenshot({ path: "C:\\Users\\Admin\\CT_NoiBo\\.tmp-mobile-attendance.png", fullPage: true });
} finally {
  await browser.close();
}
