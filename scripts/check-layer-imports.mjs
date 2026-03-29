import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");
const allowedExtensions = new Set([".js", ".jsx"]);
const layerRanks = {
  shared: 1,
  entities: 2,
  features: 3,
  widgets: 4,
  pages: 5,
  app: 6,
};

const aliasToLayer = {
  "@shared": "shared",
  "@platform": "shared",
  "@platform-target": "shared",
  "@entities": "entities",
  "@features": "features",
  "@widgets": "widgets",
  "@pages": "pages",
  "@app": "app",
  "@app-router-routes": "app",
};

const importPattern =
  /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'`]([^"'`]+)["'`]|import\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

const walk = (directory) => {
  const results = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      results.push(...walk(fullPath));
      continue;
    }

    if (!allowedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    results.push(fullPath);
  }

  return results;
};

const getLayerFromPath = (absolutePath) => {
  const relativePath = path.relative(srcRoot, absolutePath);
  const [topLevelDirectory] = relativePath.split(path.sep);

  return layerRanks[topLevelDirectory] ? topLevelDirectory : null;
};

const getLayerFromAlias = (specifier) => {
  const alias = Object.keys(aliasToLayer).find(
    (candidate) => specifier === candidate || specifier.startsWith(`${candidate}/`),
  );

  return alias ? aliasToLayer[alias] : null;
};

const resolveRelativeImport = (sourceFile, specifier) => {
  const candidate = path.resolve(path.dirname(sourceFile), specifier);
  const directMatch = allowedExtensions.has(path.extname(candidate))
    ? candidate
    : null;

  if (directMatch && fs.existsSync(directMatch)) {
    return directMatch;
  }

  for (const extension of allowedExtensions) {
    const fileWithExtension = `${candidate}${extension}`;

    if (fs.existsSync(fileWithExtension)) {
      return fileWithExtension;
    }
  }

  for (const extension of allowedExtensions) {
    const indexFile = path.join(candidate, `index${extension}`);

    if (fs.existsSync(indexFile)) {
      return indexFile;
    }
  }

  return null;
};

const getImportedLayer = (sourceFile, specifier) => {
  const aliasedLayer = getLayerFromAlias(specifier);

  if (aliasedLayer) {
    return aliasedLayer;
  }

  if (specifier.startsWith(".")) {
    const resolvedPath = resolveRelativeImport(sourceFile, specifier);
    return resolvedPath ? getLayerFromPath(resolvedPath) : null;
  }

  return null;
};

const files = walk(srcRoot);
const violations = [];

for (const file of files) {
  const sourceLayer = getLayerFromPath(file);

  if (!sourceLayer) {
    continue;
  }

  const fileText = fs.readFileSync(file, "utf8");

  for (const match of fileText.matchAll(importPattern)) {
    const specifier = match[1] || match[2];

    if (!specifier) {
      continue;
    }

    const importedLayer = getImportedLayer(file, specifier);

    if (!importedLayer) {
      continue;
    }

    if (layerRanks[importedLayer] > layerRanks[sourceLayer]) {
      violations.push({
        file: path.relative(projectRoot, file),
        sourceLayer,
        importedLayer,
        specifier,
      });
    }
  }
}

if (violations.length > 0) {
  console.error("Layer boundary check failed. Higher-level imports found:");

  for (const violation of violations) {
    console.error(
      `- ${violation.file}: ${violation.sourceLayer} cannot import ${violation.importedLayer} via "${violation.specifier}"`,
    );
  }

  process.exit(1);
}

console.log("Layer boundary check passed: import directions match the layer rules.");
