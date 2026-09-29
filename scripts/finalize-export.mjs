#!/usr/bin/env node
/**
 * Post-processing for `next build` under `output: "export"`.
 *
 * Route handlers export to a file named after the route with no extension, so
 * /admin lands at out/admin. Most static hosts would serve that as a download.
 * Moving it to out/admin/index.html makes /admin/ an ordinary HTML page.
 */
import { existsSync, statSync, renameSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const file = path.join(OUT, "admin");

if (existsSync(file) && statSync(file).isFile()) {
  renameSync(file, `${file}.tmp`);
  mkdirSync(file);
  renameSync(`${file}.tmp`, path.join(file, "index.html"));
  console.log("export: out/admin -> out/admin/index.html");
}
