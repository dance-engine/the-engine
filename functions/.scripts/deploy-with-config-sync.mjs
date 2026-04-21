#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const functionsDir = path.resolve(__dirname, "..");

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const [key, inlineValue] = token.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      out[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
};

const spawnCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: functionsDir,
      shell: false,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

const argv = process.argv.slice(2);
const parsedArgs = parseArgs(argv);

const syncArgs = [
  path.resolve(__dirname, "sync-config-assets.mjs"),
  "--if-changed",
  "true",
];

if (parsedArgs.stage) syncArgs.push("--stage", parsedArgs.stage);
if (parsedArgs.profile) syncArgs.push("--profile", parsedArgs.profile);
if (parsedArgs.region) syncArgs.push("--region", parsedArgs.region);

const syncExitCode = await spawnCommand(process.execPath, syncArgs);
if (syncExitCode !== 0) {
  process.exit(syncExitCode);
}

const deployExitCode = await spawnCommand("serverless", ["deploy", ...argv]);
process.exit(deployExitCode);
