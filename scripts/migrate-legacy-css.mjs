import { readFile, writeFile } from "node:fs/promises";
import postcss from "postcss";

const entry = "src/styles/legacy.css";
const source = await readFile(entry, "utf8");
const imports = [...source.matchAll(/@import\s+"([^"]+)"(?:\s+layer\(legacy\))?;/g)].map((match) => match[1]);
for (const relative of imports) {
  const file = new URL(`../src/styles/${relative}`, import.meta.url);
  const css = await readFile(file, "utf8");
  const root = postcss.parse(css);
  if (root.nodes.some((node) => node.type === "atrule" && node.name === "layer" && node.params === "legacy")) continue;
  if (root.nodes.some((node) => node.type === "atrule" && ["import", "charset"].includes(node.name))) throw new Error(`Review nested import before migrating ${relative}`);
  await writeFile(file, `/* Compatibility layer. Shared ERP contracts live outside this layer. */\n@layer legacy {\n${css.trimEnd()}\n}\n`);
}
await writeFile(entry, source.replace(/\s+layer\(legacy\)(?=;)/g, ""));
console.log(`Legacy styles isolated: ${imports.length} files`);
