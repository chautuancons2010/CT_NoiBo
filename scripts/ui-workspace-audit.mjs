import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const normalize = value => value.replaceAll("\\", "/");
const read = file => readFileSync(file, "utf8");
const routes = globSync("src/app/(app)/**/page.tsx").map(file => {
  const route = normalize(path.dirname(file)).replace("src/app/(app)", "") || "/";
  const source = read(file);
  return { route, file: normalize(file), family: route.split("/")[1] || "root", owners: [...source.matchAll(/from\s*["'](@\/features\/[^"']+)["']/g)].map(match => match[1]) };
}).sort((a, b) => a.route.localeCompare(b.route));

const components = [];
for (const file of globSync("src/features/**/*.tsx").filter(file => !/\.(test|spec)\.tsx$/.test(file))) {
  const source = read(file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const tags = new Map();
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(ast);
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (tags.size) components.push({ file: normalize(file), family: normalize(file).split("/")[2], tags: Object.fromEntries(tags) });
}

// These are structural regressions in reviewed workspaces, not a visual-quality score.
const violations = [];
for (const component of components.filter(item => item.tags.ListWorkspace)) {
  if (component.tags.DataSurface && /<DataSurface[^>]*>\s*<div className="data-surface__toolbar">\s*<FilterBar/.test(read(component.file))) {
    violations.push(`${component.file}: a second list anatomy remains beside ListWorkspace`);
  }
}
const layout = read("src/components/shared/PageLayouts.tsx");
const slots = ["list-workspace__navigation", "list-workspace__summary", "list-workspace__filters", "list-workspace__status", "list-workspace__content", "list-workspace__footer"];
const positions = slots.map(slot => layout.indexOf(slot));
if (positions.some((position, index) => position < 0 || index > 0 && position <= positions[index - 1])) violations.push("ListWorkspace slot order changed");

const consumerFamilies = [...new Set(components.filter(item => item.tags.ListWorkspace && item.family !== "foundation").map(item => item.family))].sort();
const counts = Object.fromEntries([...new Set(routes.map(item => item.family))].sort().map(family => [family, routes.filter(item => item.family === family).length]));
const report = {
  scope: "Source inventory; does not establish authenticated browser or business-flow coverage.",
  routes, routeCounts: counts, components,
  adoption: { listWorkspaces: components.filter(item => item.family !== "foundation").reduce((sum, item) => sum + (item.tags.ListWorkspace ?? 0), 0), families: consumerFamilies, recordSheets: components.filter(item => item.tags.RecordSheet).map(item => item.file) },
  violations
};
if (process.argv.includes("--write")) {
  mkdirSync("test-results/system-workspace-audit", { recursive: true });
  writeFileSync("test-results/system-workspace-audit/inventory.json", JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ routes: routes.length, routeCounts: counts, featureOwners: components.length, adoption: report.adoption, violations }, null, 2));
if (violations.length) process.exitCode = 1;
