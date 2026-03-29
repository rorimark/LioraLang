import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const reporterPath = path.join(projectRoot, "scripts", "test-reporter.mjs");
const colorsEnabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const colorize = (code, value) => (colorsEnabled ? `\u001B[${code}m${value}\u001B[0m` : value);
const green = (value) => colorize("32", value);
const red = (value) => colorize("31", value);
const cyan = (value) => colorize("36", value);
const dim = (value) => colorize("90", value);

const FILE_ICON = cyan(">");
const SUITE_ICON = dim("›");
const PASS_ICON = green("✓");
const FAIL_ICON = red("✕");
const DETAIL_ICON = red("↳");

const args = process.argv.slice(2);
const watchMode = args.includes("--watch");
const coverageMode = args.includes("--coverage");
const verboseMode = args.includes("--verbose");
const reportMode = args.includes("--report");

const passthroughIndex = args.indexOf("--");
const passthroughArgs = passthroughIndex >= 0 ? args.slice(passthroughIndex + 1) : [];

const log = (message = "") => {
  process.stdout.write(`${message}\n`);
};

const getCheckOutputLines = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const runCommand = (command, commandArgs, options = {}) =>
  new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      env: options.env ?? process.env,
      stdio: options.stdio ?? ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
    }

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });

const printCheckResult = (label, result) => {
  log("");
  log(`${FILE_ICON} ${cyan(label)}`);

  const output = `${result.stdout}\n${result.stderr}`;
  const lines = getCheckOutputLines(output);

  if (result.code === 0) {
    if (lines.length === 0) {
      log(`  ${PASS_ICON} passed`);
      return;
    }

    const [firstLine, ...rest] = lines;
    log(`  ${PASS_ICON} ${firstLine}`);

    for (const line of rest) {
      log(`    ${SUITE_ICON} ${dim(line)}`);
    }

    return;
  }

  if (lines.length === 0) {
    log(`  ${FAIL_ICON} failed`);
    return;
  }

  const [firstLine, ...rest] = lines;
  log(`  ${FAIL_ICON} ${firstLine}`);

  for (const line of rest) {
    log(`    ${DETAIL_ICON} ${line}`);
  }
};

const runCheck = async (label, command, commandArgs) => {
  const result = await runCommand(command, commandArgs);
  printCheckResult(label, result);

  if (result.code !== 0) {
    process.exit(result.code);
  }
};

const runVitest = async () => {
  const vitestArgs = ["exec", "vitest"];

  if (!watchMode) {
    vitestArgs.push("run");
  }

  if (coverageMode) {
    vitestArgs.push("--coverage");
  }

  if (verboseMode) {
    vitestArgs.push("--reporter=verbose");
  } else if (reportMode) {
    vitestArgs.push(`--reporter=${reporterPath}`);
  }

  if (passthroughArgs.length > 0) {
    vitestArgs.push(...passthroughArgs);
  }

  log("");
  log(`${FILE_ICON} ${cyan("tests")}`);

  const child = spawn("pnpm", vitestArgs, {
    cwd: projectRoot,
    env: {
      ...process.env,
      VITE_APP_TARGET: "web",
    },
    stdio: "inherit",
  });

  child.on("close", (code) => {
    process.exit(code ?? 1);
  });
};

await runCheck("boundaries", "bash", ["scripts/check-no-electron-imports.sh"]);
await runCheck("layers", "node", ["scripts/check-layer-imports.mjs"]);
await runVitest();
