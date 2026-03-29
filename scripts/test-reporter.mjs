import path from "node:path";
import { DefaultReporter } from "vitest/node";

const COLORS_ENABLED = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const colorize = (code, value) => (COLORS_ENABLED ? `\u001B[${code}m${value}\u001B[0m` : value);
const green = (value) => colorize("32", value);
const red = (value) => colorize("31", value);
const yellow = (value) => colorize("33", value);
const cyan = (value) => colorize("36", value);
const dim = (value) => colorize("90", value);

const STATUS_ICON = {
  passed: green("✓"),
  failed: red("✕"),
  skipped: yellow("○"),
  pending: yellow("○"),
  todo: dim("•"),
};

const FILE_ICON = cyan(">");
const SUITE_ICON = dim("›");
const ERROR_ICON = red("↳");

const formatDuration = (duration) => {
  if (!Number.isFinite(duration)) {
    return "";
  }

  return dim(` · ${Math.max(0, Math.round(duration))}ms`);
};

const getTaskLineage = (task) => {
  const lineage = [];
  let current = task?.suite;

  while (current?.name) {
    lineage.unshift(current.name);
    current = current.suite;
  }

  return lineage;
};

const getModuleLabel = (test, rootDir) => {
  const rawName = test?.module?.task?.name || "unknown test file";

  if (path.isAbsolute(rawName)) {
    return path.relative(rootDir, rawName) || rawName;
  }

  return rawName;
};

const getErrorLines = (error) => {
  const message = typeof error?.message === "string" && error.message.trim()
    ? error.message.trim()
    : String(error);

  return message.split("\n").filter(Boolean);
};

const getSharedPrefixLength = (previousItems, nextItems) => {
  const maxLength = Math.min(previousItems.length, nextItems.length);
  let index = 0;

  while (index < maxLength && previousItems[index] === nextItems[index]) {
    index += 1;
  }

  return index;
};

const getIndent = (depth) => `  ${"  ".repeat(depth)}`;

export default class TestReporter extends DefaultReporter {
  currentModuleLabel = "";
  currentLineage = [];

  onTestModuleEnd(module) {
    this.summary?.onTestModuleEnd(module);
  }

  onTestCaseResult(test) {
    super.onTestCaseResult(test);

    const result = test.result();
    const moduleLabel = getModuleLabel(test, this.ctx.config.root);

    if (moduleLabel !== this.currentModuleLabel) {
      this.currentModuleLabel = moduleLabel;

      if (this.currentModuleLabel) {
        this.log("");
      }

      this.currentLineage = [];
      this.log(`${FILE_ICON} ${cyan(moduleLabel)}`);
    }

    const icon = STATUS_ICON[result.state] || "•";
    const lineage = getTaskLineage(test.task);
    const duration = formatDuration(result.duration);
    const sharedPrefixLength = getSharedPrefixLength(this.currentLineage, lineage);

    for (let index = sharedPrefixLength; index < lineage.length; index += 1) {
      this.log(`${getIndent(index)}${SUITE_ICON} ${dim(lineage[index])}`);
    }

    this.currentLineage = lineage;
    this.log(`${getIndent(lineage.length)}${icon} ${test.task.name}${duration}`);

    if (result.state === "failed" && Array.isArray(result.errors)) {
      for (const error of result.errors) {
        for (const line of getErrorLines(error)) {
          this.log(`${getIndent(lineage.length + 1)}${ERROR_ICON} ${line}`);
        }
      }
    }
  }
}
