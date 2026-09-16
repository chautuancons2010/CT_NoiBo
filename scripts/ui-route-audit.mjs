import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "src", "app", "(app)");

async function collectPages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const pages = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) pages.push(...await collectPages(target));
    if (entry.isFile() && entry.name === "page.tsx") pages.push(target);
  }
  return pages;
}

function routeFor(file) {
  const relative = path.relative(appRoot, path.dirname(file)).replaceAll(path.sep, "/");
  return relative ? `/${relative}` : "/";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const pages = await collectPages(appRoot);
const classifications = { direct: [], delegated: [], redirect: [] };

for (const file of pages) {
  const source = await readFile(file, "utf8");
  const route = routeFor(file);
  if (/\bredirect\s*\(/.test(source)) classifications.redirect.push(route);
  else if (/<(?:PageHeader|h1)\b/.test(source)) classifications.direct.push(route);
  else if (/from\s*["']@\/(?:features|components)\//.test(source) || /export\s*\{\s*default\s*\}\s*from\s*["']\.\.\/page["']/.test(source)) classifications.delegated.push(route);
  else throw new Error(`Route ${route} không có title owner trực tiếp, redirect hoặc component được ủy quyền.`);
}

const [header, shell, rail, breadcrumb, registry, layout, css, employeePage, employeeTable, dashboardView, workbench, dataTable, moduleRegistry, workspaceView] = await Promise.all([
  readFile(path.join(root, "src/components/layout/AppHeader.tsx"), "utf8"),
  readFile(path.join(root, "src/components/layout/AppShell.tsx"), "utf8"),
  readFile(path.join(root, "src/components/layout/AppRail.tsx"), "utf8"),
  readFile(path.join(root, "src/components/layout/Breadcrumb.tsx"), "utf8"),
  readFile(path.join(root, "src/config/routeRegistry.ts"), "utf8"),
  readFile(path.join(root, "src/app/layout.tsx"), "utf8"),
  readFile(path.join(root, "src/app/globals.css"), "utf8"),
  readFile(path.join(root, "src/features/employees/pages/EmployeeListPage.tsx"), "utf8"),
  readFile(path.join(root, "src/features/employees/components/EmployeeListTable.tsx"), "utf8"),
  readFile(path.join(root, "src/features/dashboard/components/DashboardView.tsx"), "utf8"),
  readFile(path.join(root, "src/components/shared/Workbench.tsx"), "utf8"),
  readFile(path.join(root, "src/components/shared/DataTable.tsx"), "utf8"),
  readFile(path.join(root, "src/config/moduleRegistry.ts"), "utf8"),
  readFile(path.join(root, "src/features/workspace/WorkspaceView.tsx"), "utf8")
]);

assert(!/applicationForPath/.test(header), "Topbar đang sở hữu lại tên ứng dụng/route.");
assert(!/app-header__(?:identity|title|application)/.test(header), "Topbar đang render lại khối định danh route.");
assert(/breadcrumbs\.length\s*>\s*1/.test(shell), "AppShell chưa bỏ breadcrumb một cấp.");
assert(/items\.length\s*<\s*2/.test(breadcrumb), "Breadcrumb chưa tự ẩn khi chỉ có một mục.");
assert(!/<AppSidebar/.test(shell), "AppShell vẫn render sidebar trắng thứ hai.");
assert(/contextualNavigationGroups/.test(rail) && /href=["']\/workspace["']/.test(rail), "Sidebar chính chưa chứa menu module và nút Ứng dụng.");
assert(/pathname\s*===\s*["']\/dashboard["'][\s\S]{0,80}?return\s*\[\]/.test(registry), "Dashboard vẫn sinh breadcrumb lặp.");
assert(/@fontsource\/inter\/400\.css/.test(layout), "Thiếu Inter đầy đủ Latin + Vietnamese 400.");
assert(/@fontsource\/inter\/500\.css/.test(layout), "Thiếu Inter đầy đủ Latin + Vietnamese 500.");
assert(/@fontsource\/inter\/600\.css/.test(layout), "Thiếu Inter đầy đủ Latin + Vietnamese 600.");
assert(!/@fontsource\/inter\/(?:vietnamese-)?700\.css/.test(layout), "Inter 700 không được tải toàn cục.");
assert(!/@fontsource\/inter\/vietnamese-(?:400|500|600)\.css/.test(layout), "Không được dùng riêng subset Vietnamese vì sẽ thiếu glyph Latin.");
assert(/--topbar-height:\s*58px/.test(css), "Thiếu token chiều cao topbar chuẩn.");
assert(!/top:\s*(?:58|66)px/.test(css), "Vẫn còn sticky offset hardcode 58/66px.");
assert(/className=["']employee-filter-bar["']/.test(employeePage), "Màn Nhân viên chưa dùng compact filter toolbar.");
assert((employeePage.match(/\blabelHidden\b/g) ?? []).length === 4, "Bốn select lọc Nhân viên chưa giữ label accessible dạng compact.");
assert(/className=["']employee-table["']/.test(employeeTable), "Bảng Nhân viên chưa có contract độ rộng riêng.");
assert(!/\bid:\s*["']joinDate["']/.test(employeeTable), "Bảng Nhân viên vẫn còn cột Ngày vào làm.");
assert(/Final viewport fit:[\s\S]*?\.data-table-scroll,[\s\S]*?overflow-x:\s*clip/.test(css), "Bảng dữ liệu vẫn cho phép cuộn ngang.");
assert(/\.employee-table \.data-table,[\s\S]{0,180}?min-width:\s*0/.test(css), "Bảng Nhân viên chưa co vừa vùng nội dung.");
assert(/dashboard-command-bar/.test(dashboardView), "Dashboard chưa khôi phục thanh tác vụ theo dữ liệu phân quyền.");
assert(/dashboard-overview__grid/.test(dashboardView) && /dashboard-analytics__plot/.test(dashboardView), "Dashboard chưa có KPI strip và analytics từ dữ liệu thật.");
assert(/featuredActions\s*=\s*quickActions\.slice\(0,\s*4\)/.test(dashboardView) && /additionalActions\s*=\s*quickActions\.slice\(4\)/.test(dashboardView), "Dashboard chưa gom tác vụ phụ vào menu.");
assert(/dashboard-chart-grid/.test(dashboardView) && /charts\.slice\(0,\s*2\)/.test(dashboardView), "Dashboard chưa giới hạn chart hữu ích từ dữ liệu thật.");
assert(/dashboard-primary-grid/.test(dashboardView) && /dashboard-secondary-grid/.test(dashboardView), "Dashboard chưa có grid tổng quan hai tầng.");
assert(/dashboard-zero-summary/.test(dashboardView) && !/Không còn mục nào cần xử lý trong nhóm này/.test(dashboardView), "Dashboard vẫn dùng panel rỗng cỡ lớn.");
assert(/operational-section__body/.test(workbench), "Panel nghiệp vụ chưa tách header và body.");
assert(/Corrective workspace redesign/.test(css), "Thiếu lớp visual corrective cho workspace ERP.");
assert(/onDoubleClick/.test(dataTable) && /event\.key\s*===\s*["']Enter["']/.test(dataTable), "Bảng dữ liệu chưa hỗ trợ mở bản ghi bằng double-click và Enter.");
assert(/applicationsForLauncher/.test(moduleRegistry) && /accessible/.test(moduleRegistry), "Registry chưa giữ ứng dụng bị khóa trong launcher.");
assert(/is-locked/.test(workspaceView) && /aria-disabled/.test(workspaceView), "Launcher chưa hiển thị trạng thái ứng dụng bị khóa.");

console.log(`PASS ${pages.length} authenticated routes`);
console.log(`  title trực tiếp: ${classifications.direct.length}`);
console.log(`  title trong component được ủy quyền: ${classifications.delegated.length}`);
console.log(`  redirect: ${classifications.redirect.length}`);
console.log("PASS pastel dashboard, compact actions, real-data charts, no horizontal scrolling và Inter contract");
