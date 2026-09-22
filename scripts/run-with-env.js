#!/usr/bin/env node
/**
 * Loads root .env then runs the remaining CLI args in the caller's cwd.
 * Usage (from a workspace package): node ../../scripts/run-with-env.js <cmd> ...args
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");

if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: run-with-env.js <command> [...args]");
  process.exit(1);
}

const binDir = path.join(root, "node_modules", ".bin");
const localBin = path.join(binDir, cmd);
const resolvedCmd = fs.existsSync(localBin) ? localBin : cmd;

const result = spawnSync(resolvedCmd, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
  },
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
