import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

const baseUrl = process.env.UI_QA_BASE_URL || "http://localhost:3100";
const browserPath = process.env.UI_QA_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const output = path.join(process.cwd(), "docs", "ui-evidence", "modern-rounded");
const viewports = [360, 390, 768, 1024, 1440];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: browserPath, headless: true });

try {
  for (const width of viewports) {
    const height = width <= 430 ? 844 : width <= 1024 ? 900 : 1000;
    const page = await browser.newPage({ viewport: { width, height }, locale: "vi-VN" });
    await page.goto(`${baseUrl}/ui-preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const main = document.querySelector(".page-main");
      const shell = document.createElement("div");
      shell.className = "app-shell";
      main?.parentNode?.insertBefore(shell, main);
      if (main) shell.append(main);
      const icon = document.createElement("button");
      icon.className = "icon-button icon-button--secondary";
      icon.setAttribute("aria-label", "Refresh");
      icon.textContent = "R";
      main?.append(icon);
      const disabled = document.createElement("button");
      disabled.className = "button button--primary";
      disabled.disabled = true;
      disabled.textContent = "Disabled";
      main?.append(disabled);
    });
    if (width < 768) {
      await page.locator(".filter-bar .mobile-filter-trigger").click();
      await page.locator(".filter-sheet .select-control__trigger").waitFor({ state: "visible" });
    }

    const audit = await page.evaluate(() => {
      const inspect = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          width: rect.width,
          height: rect.height,
          radius: style.borderTopLeftRadius,
          transform: style.transform
        };
      };
      const primary = document.querySelector(".button--primary");
      const secondary = document.querySelector(".button--secondary");
      const icon = document.querySelector(".icon-button");
      const search = document.querySelector('.search-input[data-ui="search-input"]');
      const filter = document.querySelector('.filter-sheet .select-control__trigger') || document.querySelector('.filter-bar[data-ui="filter-bar"] .select-control__trigger');
      const card = document.querySelector(".ui-playground-grid .card");
      return {
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        primary: primary && inspect(primary),
        secondary: secondary && inspect(secondary),
        icon: icon && inspect(icon),
        search: search && inspect(search),
        filter: filter && inspect(filter),
        disabled: document.querySelector("button.button--primary:disabled")?.disabled,
        cardRadius: getComputedStyle(card).borderTopLeftRadius
      };
    });

    assert.ok(audit.document <= audit.viewport + 1, `Horizontal overflow at ${width}px: ${JSON.stringify(audit)}`);
    for (const name of ["primary", "secondary", "search", "filter"]) {
      assert.ok(audit[name], `Missing ${name} at ${width}px`);
      assert.equal(audit[name].radius, "999px", `${name} is not a pill at ${width}px: ${JSON.stringify(audit[name])}`);
      assert.equal(audit[name].transform, "none", `${name} has a motion transform at ${width}px`);
    }
    assert.ok(audit.icon, `Missing icon action at ${width}px`);
    assert.equal(audit.icon.width, audit.icon.height, `Icon action is not square at ${width}px`);
    assert.equal(audit.icon.radius, "50%", `Icon action is not circular at ${width}px`);
    assert.ok(Number.parseFloat(audit.cardRadius) >= 12 && Number.parseFloat(audit.cardRadius) <= 16, `Card radius should be 12px to 16px at ${width}px: ${JSON.stringify(audit)}`);
    assert.equal(audit.disabled, true, `Disabled state was lost at ${width}px`);
    if (width <= 430) {
      assert.ok(audit.primary.height >= 44, `Primary touch target is too short at ${width}px`);
      assert.equal(audit.icon.width, 44, `Mobile icon action is not 44px at ${width}px`);
    }

    if (width < 768) await page.locator(".filter-sheet .overlay__header button").click();

    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: path.join(output, `ui-preview-${width}.png`), fullPage: true });
    }
    console.log(`PASS Modern Rounded ${width}px - no overflow - pill, circular icon, disabled state`);
    await page.close();
  }
} finally {
  await browser.close();
}
