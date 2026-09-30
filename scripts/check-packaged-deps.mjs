// Checks a packaged app's own node_modules: every package the app ships
// must find each dependency it declares, in a version its range accepts,
// the way Node will look for it at runtime. A release that fails this would
// crash on launch with "Cannot find module" (as 3.0.0 did with jsonfile).
//
// Usage: node scripts/check-packaged-deps.mjs <path to app.asar or an extracted app folder>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { extractAll } from "@electron/asar";

const target = process.argv[2];

if (!target || !fs.existsSync(target)) {
  console.error("Give the path to app.asar or an extracted app folder.");
  process.exit(2);
}

const extractAsar = (asarPath) => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "liora-asar-"));
  extractAll(asarPath, outDir);
  return outDir;
};

const appRoot = fs.statSync(target).isDirectory() ? target : extractAsar(target);
const requireFromApp = createRequire(path.join(appRoot, "package.json"));
let semver = null;

try {
  semver = requireFromApp("semver");
} catch {
  semver = null;
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

// Where Node finds `name` from a package folder: its own node_modules, then
// each parent's, up to the app root.
const resolveFrom = (packageDir, name) => {
  let dir = packageDir;

  while (dir.startsWith(appRoot)) {
    const candidate = path.join(dir, "node_modules", name, "package.json");

    if (fs.existsSync(candidate)) {
      return candidate;
    }

    if (dir === appRoot) {
      break;
    }

    dir = path.dirname(dir);
  }

  return null;
};

// Packages a dependency uses only while it is being installed, never when
// the app runs: better-sqlite3 downloads its prebuilt binary with
// prebuild-install, and the app itself loads the binary through bindings.
// What only they need may be absent from the app.
const INSTALL_TIME_ONLY = new Set(["prebuild-install"]);

// Walk what the app can load: from its dependencies to theirs, the way Node
// resolves them, checking each one on the way.
const problems = [];
const visited = new Set();
const queue = [appRoot];

while (queue.length > 0) {
  const packageDir = queue.shift();

  if (visited.has(packageDir)) {
    continue;
  }

  visited.add(packageDir);
  const manifest = readJson(path.join(packageDir, "package.json"));
  const optional = new Set(Object.keys(manifest.optionalDependencies || {}));
  const declared = { ...manifest.dependencies, ...manifest.optionalDependencies };
  const owner = path.relative(appRoot, packageDir) || "(app)";

  for (const [name, range] of Object.entries(declared)) {
    if (INSTALL_TIME_ONLY.has(name)) {
      continue;
    }

    const resolved = resolveFrom(packageDir, name);

    if (!resolved) {
      if (!optional.has(name)) {
        problems.push(`${owner} needs ${name}@${range}, which is not in the app`);
      }
      continue;
    }

    const version = readJson(resolved).version;

    if (semver && semver.validRange(range) && !semver.satisfies(version, range, { includePrerelease: true })) {
      problems.push(`${owner} needs ${name}@${range}, but finds ${version} at ${path.relative(appRoot, path.dirname(resolved))}`);
    }

    queue.push(path.dirname(resolved));
  }
}

const packages = [...visited];

if (problems.length > 0) {
  console.error(`Packaged app is missing what it needs (${problems.length}):`);
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exit(1);
}

console.log(`Packaged dependencies check passed: ${packages.length - 1} packages the app can load, each finds what it needs.`);
