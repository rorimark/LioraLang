import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT, "release");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "RELEASE_NOTES.md");

const run = (command) =>
  execSync(command, { encoding: "utf8" }).trim();

const safeRun = (command) => {
  try {
    return run(command);
  } catch {
    return "";
  }
};

const getPackageVersion = () => {
  const packagePath = path.join(PROJECT_ROOT, "package.json");
  const raw = fs.readFileSync(packagePath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version || "0.0.0";
};

const getLastTag = () => {
  return safeRun("git describe --tags --abbrev=0");
};

const getCommitSubjects = (range) => {
  const command = range
    ? `git log ${range} --pretty=format:%s`
    : "git log --pretty=format:%s";
  const raw = safeRun(command);
  if (!raw) {
    return [];
  }
  return raw.split("\n").map((line) => line.trim()).filter(Boolean);
};

const normalizeSubject = (subject) => subject.replace(/^\w+\([^)]+\):\s*/i, "");

const classifyCommits = (subjects) => {
  const groups = {
    features: [],
    fixes: [],
    improvements: [],
    docs: [],
    other: [],
    breaking: [],
  };

  subjects.forEach((subject) => {
    const lower = subject.toLowerCase();
    const isBreaking = /!:/u.test(subject) || lower.includes("breaking change");

    if (isBreaking) {
      groups.breaking.push(normalizeSubject(subject));
      return;
    }

    if (lower.startsWith("feat")) {
      groups.features.push(normalizeSubject(subject));
      return;
    }

    if (lower.startsWith("fix")) {
      groups.fixes.push(normalizeSubject(subject));
      return;
    }

    if (lower.startsWith("perf") || lower.startsWith("refactor")) {
      groups.improvements.push(normalizeSubject(subject));
      return;
    }

    if (lower.startsWith("docs")) {
      groups.docs.push(normalizeSubject(subject));
      return;
    }

    groups.other.push(subject);
  });

  return groups;
};

const formatSection = (title, items) => {
  if (!items || items.length === 0) {
    return "";
  }

  const lines = items.map((item) => `- ${item}`);
  return `## ${title}\n${lines.join("\n")}\n`;
};

const main = () => {
  const version = getPackageVersion();
  const lastTag = getLastTag();
  const range = lastTag ? `${lastTag}..HEAD` : "";
  const subjects = getCommitSubjects(range);
  const groups = classifyCommits(subjects);

  const sections = [
    formatSection("What’s New", groups.features),
    formatSection("Fixes", groups.fixes),
    formatSection("Improvements", groups.improvements),
    formatSection("Docs", groups.docs),
    formatSection("Other", groups.other),
  ].filter(Boolean);

  const breakingSection = formatSection("Breaking Changes", groups.breaking);

  const header = `# LioraLang v${version}\n`;
  const meta = lastTag
    ? `\nCompared to ${lastTag}.\n`
    : "\nFirst release notes generated from repository history.\n";

  const content = [header, meta, breakingSection, ...sections].join("\n").trimEnd();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${content}\n`, "utf8");

  process.stdout.write(`Release notes written to ${OUTPUT_FILE}\n`);
};

main();
