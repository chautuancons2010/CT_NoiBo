import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const css = [
  "src/styles/tokens.css",
  "src/app/globals.css",
  "src/app/theme.css",
  "src/features/projects/components/ProjectPortfolioWorkspace.module.css",
  "src/features/projects/components/package-workspace/PackageWorkspace.module.css"
].map((file) => readFileSync(file, "utf8")).join("\n");
const chrome = [process.env.CHROME_BIN, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => p && existsSync(p));
assert.ok(chrome, "Set CHROME_BIN to an installed Chromium/Chrome executable");

const html = '<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width, initial-scale=1">' +
  "<style>" + css + "</style></head><body>" +
  '<div class="app-shell"><aside class="app-rail"></aside><div class="app-content">' +
  '<header class="app-header"><div class="app-header__search"><button class="header-search">Tìm kiếm</button></div></header>' +
  '<main class="page-main"><div class="page-stack"><h1>Kiểm tra nút</h1><section class="card">' +
  '<div class="filter-bar"><div class="filter-bar__controls"><label class="search-input">' +
  '<input class="input" type="search" placeholder="Tìm kiếm"></label>' +
  '<select class="select" aria-label="Trạng thái"><option>Tất cả</option></select></div></div>' +
  '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
  '<button class="button button--primary">Tạo gói</button><button class="button button--secondary">Bộ lọc</button>' +
  '<button class="button button--soft">Cập nhật</button><button class="icon-button icon-button--secondary" aria-label="Làm mới">↻</button>' +
  '<button class="button button--primary" disabled>Đã khóa</button></div></section>' +
  '<div class="portfolio"><section class="commandBar"><label class="search">' +
  '<input type="search" placeholder="Tên gói, khách hàng"></label><select class="select" aria-label="Nhóm gói">' +
  '<option>Tất cả gói</option></select><a href="#go" class="button button--primary">+ Tạo gói</a></section>' +
  '<div class="summary"><button>Đang thi công</button><button>Chuẩn bị</button><button>Hoàn thành</button></div></div>' +
  '<div class="mobileQuickActions"><button>Điểm danh</button><button>Báo cáo</button></div>' +
  "</div></main></div></div></body></html>";

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });
try {
  for (const width of [360, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.setContent(html);
    const result = await page.evaluate(() => {
      const shape = (selector) => {
        const el = document.querySelector(selector);
        const rect = el.getBoundingClientRect();
        return { radius: parseFloat(getComputedStyle(el).borderTopLeftRadius), width: rect.width, height: rect.height };
      };
      return {
        windowWidth: window.innerWidth, documentWidth: document.documentElement.scrollWidth,
        primary: shape(".button--primary:not(:disabled)"), secondary: shape(".button--secondary"),
        icon: shape(".icon-button"), search: shape(".search-input"),
        portfolioSearch: shape(".portfolio .search"), portfolioButton: shape(".portfolio a.button"),
        mobileButton: shape(".mobileQuickActions button"),
        disabled: document.querySelector("button:disabled").disabled
      };
    });
    assert.ok(result.documentWidth <= result.windowWidth + 1,
      "Horizontal overflow " + width + ": " + JSON.stringify(result));
    const names = ["primary", "secondary", "icon", "search", "portfolioSearch", "portfolioButton"];
    if (width <= 900) names.push("mobileButton");
    for (const name of names) {
      const item = result[name];
      assert.ok(item.radius >= Math.min(item.height / 2, 15),
        "Non-rounded " + name + " at " + width + ": " + JSON.stringify(item));
    }
    if (width <= 700) {
      assert.ok(result.primary.height >= 44 && result.mobileButton.height >= 44,
        "Mobile action hit area is smaller than 44px");
    }
    assert.ok(result.disabled, "Disabled state was lost");
    await page.close();
    console.log("PASS: rounded UI responsive at " + width + "px");
  }
} finally {
  await browser.close();
}
