#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const functionsDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(functionsDir, "..");
const sourceDir = path.resolve(repoRoot, "aws", "s3");

if (!existsSync(sourceDir)) {
  console.error(`Source directory not found: ${sourceDir}`);
  process.exit(1);
}

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

const args = parseArgs(process.argv.slice(2));
const stage = args.stage || process.env.STAGE || process.env.stage || "preview";
const profile = args.profile || process.env.AWS_PROFILE;
const region = args.region || process.env.AWS_REGION;
const deleteRemote = args.delete === "true";
const dryRun = args["dry-run"] === "true";
const ifChanged = args["if-changed"] === "true";
const quiet = args.quiet === "true";
const serverlessHook = args["serverless-hook"] === "true";
const verbose = args.verbose === "true";

const bucket = `${stage}-danceengine-config`;
const destination = `s3://${bucket}`;

const logPrefix = "[config-sync]";
const log = (message) => console.log(`${logPrefix} ${message}`);
const logError = (message) => console.error(`${logPrefix} ${message}`);

const makeAwsArgs = ({ forceDryRun = false } = {}) => {
  const baseArgs = ["s3", "sync", sourceDir, destination, "--acl", "private"];
  if (profile) baseArgs.push("--profile", profile);
  if (region) baseArgs.push("--region", region);
  if (deleteRemote) baseArgs.push("--delete");
  if (!verbose) baseArgs.push("--only-show-errors");
  if (dryRun || forceDryRun) baseArgs.push("--dryrun");
  return baseArgs;
};

const runAws = ({ awsArgs, capture = false }) => {
  const child = spawn("aws", awsArgs, {
    cwd: functionsDir,
    shell: false,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    if (capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
};

if (serverlessHook) {
  // Ensure we start on a fresh line instead of appending to Serverless spinner text.
  process.stdout.write("\n");
}

log(`Checking config assets for ${destination}`);
if (!quiet) {
  log(`Source: ${sourceDir}`);
  log(`Stage: ${stage}`);
}

try {
  if (ifChanged) {
    const probeArgs = makeAwsArgs({ forceDryRun: true });
    const probeResult = await runAws({ awsArgs: probeArgs, capture: true });

    if (probeResult.code !== 0) {
      if (probeResult.stdout.trim()) console.log(probeResult.stdout.trim());
      if (probeResult.stderr.trim()) console.error(probeResult.stderr.trim());
      process.exit(probeResult.code);
    }

    const previewOutput = `${probeResult.stdout}\n${probeResult.stderr}`;
    // AWS CLI dry-run output can be formatted as either:
    // - (dryrun) upload: ...
    // - dryrun: upload: ...
    const hasChanges = /\(?dryrun\)?\s*[:)]\s*(upload|copy|delete):/i.test(previewOutput);

    if (!hasChanges) {
      log("No config asset changes detected. Skipping upload.");
      process.exit(0);
    }

    if (dryRun) {
      if (probeResult.stdout.trim()) console.log(probeResult.stdout.trim());
      if (probeResult.stderr.trim()) console.error(probeResult.stderr.trim());
      log("Dry run only. Config assets were not uploaded.");
      process.exit(0);
    }

    log("Changes detected. Uploading config assets...");
  }

  const syncResult = await runAws({ awsArgs: makeAwsArgs() });
  process.exit(syncResult.code);
} catch (error) {
  logError("Failed to run AWS CLI. Ensure aws cli is installed and available on PATH.");
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
