import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ROOT = process.cwd();
const NOTES_PATH = path.join(PROJECT_ROOT, "release", "RELEASE_NOTES.md");

const runCapture = (command) =>
  execSync(command, { encoding: "utf8", stdio: "pipe" }).trim();

const runLive = (command) => {
  execSync(command, { encoding: "utf8", stdio: "inherit" });
  return "";
};

const safeRun = (command) => {
  try {
    return runCapture(command);
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

  runLive(`git tag -a ${tag} -m "${tag}"`);
};

const ensureGh = () => {
  try {
    runCapture("gh --version");
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

const normalizeReleaseFileName = (fileName) =>
  fileName.replace(/\.blockmap$/i, "");

const getAssets = (version) => {
  const releaseDir = path.join(PROJECT_ROOT, "release");
  if (!fs.existsSync(releaseDir)) {
    return [];
  }

  const entries = fs.readdirSync(releaseDir);
  const primaryAssets = entries.filter((file) => {
    if (!/\.dmg$|\.exe$|\.zip$/i.test(file)) {
      return false;
    }

    return file.includes(version);
  });

  if (primaryAssets.length === 0) {
    throw new Error(
      `No release artifacts found for ${version}. Build the app before publishing.`,
    );
  }

  const primaryAssetNames = new Set(
    primaryAssets.map((file) => normalizeReleaseFileName(file)),
  );

  const blockmaps = entries.filter((file) => {
    if (!/\.blockmap$/i.test(file)) {
      return false;
    }

    const baseName = normalizeReleaseFileName(file);
    return primaryAssetNames.has(baseName);
  });

  const metadataFiles = entries.filter((file) => {
    if (!/\.ya?ml$/i.test(file)) {
      return false;
    }

    const filePath = path.join(releaseDir, file);
    return isReleaseMetadataForVersion(filePath, version);
  });

  return [...primaryAssets, ...blockmaps, ...metadataFiles].map((file) =>
    path.join(releaseDir, file),
  );
};

const main = () => {
  ensureGh();
  ensureNotes();

  const version = getPackageVersion();
  const tag = `v${version}`;
  const draft = process.env.DRAFT === "1" ? "--draft" : "";
  const prerelease = process.env.PRERELEASE === "1" ? "--prerelease" : "";

  ensureTag(tag);
  const assets = getAssets(version);
  process.stdout.write(`Publishing assets (${assets.length}):\n`);
  assets.forEach((asset) => {
    process.stdout.write(` - ${asset}\n`);
  });

  runLive("git push --tags");

  const releaseExists = Boolean(
    safeRun(`gh release view ${tag} --json tagName`)?.trim(),
  );

  if (!releaseExists) {
    const createCommand = [
      "gh release create",
      tag,
      `--title \"LioraLang ${tag}\"`,
      `--notes-file \"${NOTES_PATH}\"`,
      draft,
      prerelease,
    ]
      .filter(Boolean)
      .join(" ");

    runLive(createCommand);
  }

  const assetsArg = assets.map((file) => JSON.stringify(file)).join(" ");
  runLive(`gh release upload ${tag} ${assetsArg} --clobber`);
  process.stdout.write(`Release ${tag} published.\n`);
};

main();
