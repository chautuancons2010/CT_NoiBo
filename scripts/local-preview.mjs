import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The review build has its own output directory; ordinary next dev stays available.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const action = process.argv[2] ?? "preview";
if (!["build", "start", "preview"].includes(action)) throw new Error("Use build, start or preview.");
const port = process.env.ERP_LOCAL_PORT ?? "3000";
const slot = process.env.ERP_LOCAL_SLOT ?? "review";
if (!["review", "review-next", "review-payroll"].includes(slot)) throw new Error("Use review, review-next or review-payroll for the local build slot.");
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error("Invalid local preview port.");
const environment = { ...process.env, NODE_ENV: "production", BUILD_VARIANT: slot, APP_BASE_URL: `http://localhost:${port}` };
async function run(args) {
  const child = spawn(process.execPath, [next, ...args], { cwd: root, env: environment, stdio: "inherit", windowsHide: true });
  const stop = signal => child.kill(signal);
  const onInterrupt = () => stop("SIGINT"), onTerminate = () => stop("SIGTERM");
  process.once("SIGINT", onInterrupt); process.once("SIGTERM", onTerminate);
  try { await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Next exited with ${code}.`))); }); }
  finally { process.off("SIGINT", onInterrupt); process.off("SIGTERM", onTerminate); }
}
if (action !== "start") await run(["build", "--webpack"]);
if (action !== "build") {
  await access(path.join(root, `.next-${slot}`, "BUILD_ID"));
  await run(["start", "-p", port, "-H", process.env.ERP_LOCAL_HOST ?? "127.0.0.1"]);
}
