import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ROOT = process.cwd();
const NOTES_PATH = path.join(PROJECT_ROOT, "release", "RELEASE_NOTES.md");

const run = (command) => execSync(command, { encoding: "utf8", stdio: "pipe" }).trim();

const safeRun = (command) => {
  try {
    return run(command);
  } catch (error) {
    return error?.stdout?.toString?.() || "";
  }
};

const ensureNotes = () => {
  if (!fs.existsSync(NOTES_PATH)) {
    throw new Error(`Release notes not found at ${NOTES_PATH}. Run pnpm release:notes first.`);
  }
};

const getPackageVersion = () => {
  const packagePath = path.join(PROJECT_ROOT, "package.json");
  const raw = fs.readFileSync(packagePath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.version || "0.0.0";
};

const ensureTag = (tag) => {
  const existingTags = safeRun("git tag --list");

  if (existingTags.split("\n").includes(tag)) {
    return;
  }

  run(`git tag -a ${tag} -m "${tag}"`);
};

const ensureGh = () => {
  try {
    run("gh --version");
  } catch {
    throw new Error("GitHub CLI (gh) is required. Install it and run `gh auth login`.");
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isReleaseMetadataForVersion = (filePath, version) => {
  if (!/\.ya?ml$/i.test(filePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const versionPattern = new RegExp(`^version:\\s*${escapeRegExp(version)}\\s*$`, "m");
    return versionPattern.test(content);
  } catch {
    return false;
  }
};

const getAssets = (version) => {
  const releaseDir = path.join(PROJECT_ROOT, "release");
  if (!fs.existsSync(releaseDir)) {
    return [];
  }

  return fs
    .readdirSync(releaseDir)
    .filter((file) => {
      const filePath = path.join(releaseDir, file);
      const isCandidate = /\.dmg$|\.exe$|\.zip$|\.blockmap$|\.ya?ml$/i.test(file);

      if (!isCandidate) {
        return false;
      }

      if (/\.ya?ml$/i.test(file)) {
        return isReleaseMetadataForVersion(filePath, version);
      }

      return file.includes(version);
    })
    .map((file) => path.join(releaseDir, file));
};

const main = () => {
  ensureGh();
  ensureNotes();

  const version = getPackageVersion();
  const tag = `v${version}`;
  const draft = process.env.DRAFT === "1" ? "--draft" : "";
  const prerelease = process.env.PRERELEASE === "1" ? "--prerelease" : "";

  ensureTag(tag);
  run("git push --tags");

  const assets = getAssets(version);
  const assetsArg = assets.length > 0 ? assets.map((file) => `"${file}"`).join(" ") : "";

  const command = [
    "gh release create",
    tag,
    assetsArg,
    `--title \"LioraLang ${tag}\"`,
    `--notes-file \"${NOTES_PATH}\"`,
    draft,
    prerelease,
  ]
    .filter(Boolean)
    .join(" ");

  run(command);
  process.stdout.write(`Release ${tag} published.\n`);
};

main();
