#!/usr/bin/env node
/**
 * `npm run admin` - everything needed to edit the site locally at
 * http://localhost:3000/admin:
 *
 *  - decap-server, which lets the editor save into content/ on this machine
 *  - a watcher that re-runs the image build when content/ changes, so new or
 *    reordered photos show up on the dev site without a restart
 *  - next dev, unless one is already running on port 3000
 *
 * Publishing is still `npm run build` and deploying out/.
 */
import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = [];

function run(label, command, args) {
  const child = spawn(command, args, { cwd: ROOT, shell: true, stdio: ["ignore", "pipe", "pipe"] });
  const prefix = (chunk) =>
    String(chunk)
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => `[${label}] ${line}`)
      .join("\n") + "\n";
  child.stdout.on("data", (c) => process.stdout.write(prefix(c)));
  child.stderr.on("data", (c) => process.stderr.write(prefix(c)));
  children.push(child);
  return child;
}

async function devServerRunning() {
  try {
    await fetch("http://localhost:3000/", { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

// Image rebuilds: debounced, and never two at once.
let timer = null;
let building = false;
let again = false;
function rebuildImages() {
  if (building) {
    again = true;
    return;
  }
  building = true;
  run("images", "node", ["scripts/build-images.mjs"]).on("exit", () => {
    building = false;
    if (again) {
      again = false;
      rebuildImages();
    }
  });
}
watch(path.join(ROOT, "content"), { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(rebuildImages, 1000);
});

run("cms", "npx", ["decap-server"]);
if (await devServerRunning()) {
  console.log("[admin] using the dev server already running on port 3000");
} else {
  run("next", "npx", ["next", "dev"]);
}
rebuildImages();
console.log("\n[admin] open http://localhost:3000/admin\n");

const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
