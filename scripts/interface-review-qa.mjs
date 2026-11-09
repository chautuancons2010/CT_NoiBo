import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

// Visual and interaction review of development fixtures; no business API or
// database writes. Run against a local Next development server.
const base = new URL(process.env.UI_QA_BASE_URL || "http://127.0.0.1:3100");
assert(["localhost", "127.0.0.1"].includes(base.hostname), "Use a local development server");
const output = path.resolve(process.env.UI_QA_OUTPUT || "docs/ui-evidence/erp-revision-20261105");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.UI_QA_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});
const results = [];

async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const bounds = await page.evaluate(() => {
    const main = document.querySelector("#main-content");
    return {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      mainWidth: main?.clientWidth,
      mainScroll: main?.scrollWidth,
      surface: getComputedStyle(document.documentElement).getPropertyValue("--workspace-canvas").trim()
    };
  });
  assert(bounds.document <= bounds.viewport + 1, `${name}: document overflow ${JSON.stringify(bounds)}`);
  if (bounds.mainWidth) assert(bounds.mainScroll <= bounds.mainWidth + 1, `${name}: workspace overflow ${JSON.stringify(bounds)}`);
  const clippedPanels = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"], .select-control__panel, .dropdown__content')].filter((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.top < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1);
  }).map((node) => node.getAttribute("aria-label") || node.className));
  assert.deepEqual(clippedPanels, [], `${name}: panel outside viewport`);
  await page.screenshot({ path: path.join(output, `${name}.png`), animations: "disabled" });
  results.push({ name, ...bounds });
}

try {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, locale: "vi-VN", reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // The fixture uses the live header/launcher. Keep their background reads
    // local and deterministic; never send actions to application APIs.
    await page.route("**/api/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { items: [], count: 0, unreadCount: 0, pinnedModules: [], density: "default" } }) }));
    await page.goto(new URL("/login", base).href, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Hiển thị mật khẩu", exact: true }).click();
    assert.equal(await page.locator('[name="password"]').getAttribute("type"), "text");
    await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
    await capture(page, `login-${width}`);

    await page.goto(new URL("/ui-preview/workspace", base).href, { waitUntil: "networkidle" });
    await page.locator("[data-dashboard-metric]").first().waitFor();
    assert.equal(await page.locator("[data-dashboard-metric]").count(), 5);
    await capture(page, `dashboard-${width}`);
    const approvalFilter = page.locator('[aria-label="Nhóm công việc"]').getByRole("button", { name: /^Phê duyệt/ });
    await approvalFilter.click();
    assert.equal(await approvalFilter.getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator('[class*="attentionItem"]').count(), 1);
    await page.locator('[aria-label="Nhóm công việc"]').getByRole("button", { name: /^Tất cả/ }).click();
    if (width >= 1024) {
      await page.keyboard.press("Control+k");
      await page.getByRole("dialog", { name: "Tìm kiếm và lệnh", exact: true }).waitFor();
      await capture(page, `search-${width}`);
      await page.keyboard.press("Escape");
    }
    if (width >= 768) {
      await page.getByRole("button", { name: "Thu gọn điều hướng", exact: true }).first().click();
      assert.equal(await page.locator(".app-shell").getAttribute("data-navigation-collapsed"), "true");
      await capture(page, `dashboard-collapsed-${width}`);
    } else {
      const launcher = page.locator('[data-layout="bar"] .module-launcher__grid');
      assert((await launcher.evaluate((node) => node.scrollWidth > node.clientWidth)), "Application bar should scroll internally");
      await launcher.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
      await capture(page, `applications-scroll-${width}`);
    }

    await page.goto(new URL("/ui-preview/workspace?screen=reference", base).href, { waitUntil: "networkidle" });
    const modes = page.getByRole("navigation", { name: "Mẫu màn hình", exact: true });
    await modes.getByRole("button", { name: "Danh sách", exact: true }).click();
    await capture(page, `list-${width}`);
    const search = page.getByRole("searchbox", { name: "Tìm nhân viên mẫu", exact: true });
    await search.fill("NV002");
    assert.equal(await page.locator("#main-content").getByText("Nguyễn Minh An", { exact: true }).count(), 0);
    await search.fill("");
    if (width < 768) {
      await page.getByRole("button", { name: /^Bộ lọc/ }).click();
      const filter = page.getByRole("dialog", { name: "Bộ lọc", exact: true });
      await filter.waitFor();
      await filter.getByRole("combobox", { name: "Phòng ban", exact: true }).click();
      await capture(page, `filter-select-${width}`);
      await page.getByRole("option", { name: "Kỹ thuật", exact: true }).click();
      await filter.getByRole("button", { name: "Áp dụng", exact: true }).click();
      await filter.waitFor({ state: "hidden" });
    }
    await modes.getByRole("button", { name: "Biểu mẫu", exact: true }).click();
    await capture(page, `form-${width}`);
    await modes.getByRole("button", { name: "Lịch công", exact: true }).click();
    await capture(page, `calendar-${width}`);
    await modes.getByRole("button", { name: "Thành phần", exact: true }).click();
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "Xác nhận thao tác", exact: true });
    await confirm.waitFor();
    await capture(page, `confirm-${width}`);
    await page.keyboard.press("Escape");
    await confirm.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Mở chi tiết", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Chi tiết chứng từ", exact: true });
    await drawer.waitFor();
    await capture(page, `drawer-${width}`);
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });
    assert.equal(await page.getByRole("button", { name: "Mở chi tiết", exact: true }).evaluate((node) => node === document.activeElement), true, "Drawer should restore focus");

    await page.goto(new URL("/ui-preview/workspace?screen=employees", base).href, { waitUntil: "networkidle" });
    await page.locator("#main-content").getByRole("heading", { name: "Nhân viên", exact: true }).waitFor();
    await capture(page, `employees-${width}`);
    const employeeSearch = page.getByRole("searchbox", { name: "Tìm nhân viên", exact: true });
    await employeeSearch.fill("NV003");
    assert.equal(await page.locator("#main-content").getByText("Nguyễn Minh An", { exact: true }).count(), 0);

    await page.goto(new URL("/ui-preview/workspace?screen=projects", base).href, { waitUntil: "networkidle" });
    await page.locator("#main-content").getByRole("heading", { name: "Gói / Công trường", exact: true }).waitFor();
    await capture(page, `projects-${width}`);
    await page.getByRole("button", { name: /^Đang thực hiện/ }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Danh sách gói"] footer')?.textContent?.includes("3 / 6"));
    await capture(page, `projects-filter-${width}`);
    assert.deepEqual(errors, [], `Runtime errors at ${width}px`);
    await context.close();
    console.log(`Interface review passed at ${width}px`);
  }
  await writeFile(path.join(output, "review.json"), JSON.stringify({ fixtureOnly: true, apiRequestsIntercepted: true, results }, null, 2));
} finally {
  await browser.close();
}
