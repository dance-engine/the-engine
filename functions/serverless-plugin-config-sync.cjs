const { spawn } = require("node:child_process");
const path = require("node:path");

class ConfigAssetsSyncPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};
    this.shouldRunPostDeploySync = false;

    this.hooks = {
      "before:deploy:deploy": this.syncConfigAssets.bind(this),
      "after:deploy:deploy": this.syncConfigAssetsAfterDeploy.bind(this),
    };
  }

  runCommand(command, args, cwd, { captureOutput = false } = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "ignore",
        shell: false,
      });

      let stdout = "";
      let stderr = "";

      if (captureOutput) {
        child.stdout?.on("data", (chunk) => {
          stdout += chunk.toString();
        });

        child.stderr?.on("data", (chunk) => {
          stderr += chunk.toString();
        });
      }

      child.on("error", reject);
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
  }

  logCapturedOutput(output) {
    const all = `${output.stdout || ""}\n${output.stderr || ""}`;
    const lines = all
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      this.serverless.cli.log(line);
    }
  }

  getResolvedStage() {
    const provider = this.serverless.getProvider("aws");
    if (provider && typeof provider.getStage === "function") {
      return provider.getStage();
    }

    return (
      this.options.stage ||
      process.env.STAGE ||
      process.env.stage ||
      "preview"
    );
  }

  getAwsCliContextArgs() {
    const args = [];

    if (this.options["aws-profile"]) {
      args.push("--profile", String(this.options["aws-profile"]));
    } else if (process.env.AWS_PROFILE) {
      args.push("--profile", process.env.AWS_PROFILE);
    }

    if (this.options.region) {
      args.push("--region", String(this.options.region));
    } else if (process.env.AWS_REGION) {
      args.push("--region", process.env.AWS_REGION);
    }

    return args;
  }

  async bucketExists(serviceDir, bucket) {
    const args = ["s3api", "head-bucket", "--bucket", bucket, ...this.getAwsCliContextArgs()];
    const result = await this.runCommand("aws", args, serviceDir, { captureOutput: true });
    return result.code === 0;
  }

  async runSyncScript(serviceDir, stage) {
    const scriptPath = path.resolve(serviceDir, ".scripts", "sync-config-assets.mjs");
    const args = [
      scriptPath,
      "--if-changed",
      "true",
      "--stage",
      stage,
      "--quiet",
      "true",
    ];

    if (this.options["aws-profile"]) {
      args.push("--profile", String(this.options["aws-profile"]));
    } else if (process.env.AWS_PROFILE) {
      args.push("--profile", process.env.AWS_PROFILE);
    }

    if (this.options.region) {
      args.push("--region", String(this.options.region));
    } else if (process.env.AWS_REGION) {
      args.push("--region", process.env.AWS_REGION);
    }

    return this.runCommand(process.execPath, args, serviceDir, { captureOutput: true });
  }

  isStrictModeEnabled() {
    return String(process.env.SLS_CONFIG_SYNC_STRICT || "").toLowerCase() === "true";
  }

  handleSyncFailure(message) {
    if (this.isStrictModeEnabled()) {
      throw new this.serverless.classes.Error(message);
    }

    this.serverless.cli.log(`${message} Continuing deploy because strict mode is disabled.`);
  }

  async syncConfigAssets() {
    if (String(process.env.SLS_SKIP_CONFIG_SYNC || "").toLowerCase() === "true") {
      this.serverless.cli.log("Skipping config asset sync because SLS_SKIP_CONFIG_SYNC=true");
      return;
    }

    const serviceDir = this.serverless.config.servicePath;
    const stage = this.getResolvedStage();
    const bucket = `${stage}-danceengine-config`;

    let exists = false;
    try {
      exists = await this.bucketExists(serviceDir, bucket);
    } catch (error) {
      this.handleSyncFailure(
        `Unable to check config bucket ${bucket} before deploy: ${error instanceof Error ? error.message : String(error)}.`,
      );
      return;
    }

    if (!exists) {
      this.shouldRunPostDeploySync = true;
      this.serverless.cli.log(
        `Config bucket ${bucket} not found yet. Skipping pre-deploy sync and will retry after deploy.`,
      );
      return;
    }

    this.serverless.cli.log("Checking onboarding config assets before deploy...");
    let result;
    try {
      result = await this.runSyncScript(serviceDir, stage);
    } catch (error) {
      this.handleSyncFailure(
        `Config asset sync failed before deploy: ${error instanceof Error ? error.message : String(error)}.`,
      );
      return;
    }

    this.logCapturedOutput(result);

    if (result.code !== 0) {
      this.handleSyncFailure(`Config asset sync failed with exit code ${result.code}.`);
      return;
    }
  }

  async syncConfigAssetsAfterDeploy() {
    if (String(process.env.SLS_SKIP_CONFIG_SYNC || "").toLowerCase() === "true") {
      return;
    }

    if (!this.shouldRunPostDeploySync) {
      return;
    }

    const serviceDir = this.serverless.config.servicePath;
    const stage = this.getResolvedStage();

    this.serverless.cli.log("Running post-deploy config asset sync...");
    let result;
    try {
      result = await this.runSyncScript(serviceDir, stage);
    } catch (error) {
      this.handleSyncFailure(
        `Post-deploy config asset sync failed: ${error instanceof Error ? error.message : String(error)}.`,
      );
      return;
    }

    this.logCapturedOutput(result);

    if (result.code !== 0) {
      this.handleSyncFailure(`Post-deploy config asset sync failed with exit code ${result.code}.`);
    }
  }
}

module.exports = ConfigAssetsSyncPlugin;
