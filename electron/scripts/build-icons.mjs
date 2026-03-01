import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const assetsDir = path.join(projectRoot, "electron", "assets");
const iconsSourceDir = path.join(assetsDir, "icons");
const defaultSourceMacPngPath = path.join(iconsSourceDir, "LioraLangIcon_mac.png");
const defaultSourceWinPngPath = path.join(iconsSourceDir, "LioraLangIcon_win.png");

const runtimePngPath = path.join(assetsDir, "icon.png");
const winIcoPath = path.join(assetsDir, "icon.ico");
const macIcnsPath = path.join(assetsDir, "icon@2x.icns");
const savedMacIcnsSourcePath = path.join(iconsSourceDir, "LioraLangIcon_mac.icns");

// Windows uses many DPI buckets in shell/taskbar; more sizes reduce blur.
const icoSizes = [16, 20, 24, 30, 32, 40, 48, 60, 64, 72, 80, 96, 128, 256];
const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
const icnsTypeBySize = {
  16: "icp4",
  32: "icp5",
  64: "icp6",
  128: "ic07",
  256: "ic08",
  512: "ic09",
  1024: "ic10",
};

const assertFileExists = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
};

const run = (bin, args) => {
  execFileSync(bin, args, { stdio: "pipe" });
};

const escapePowerShellString = (value) => value.replace(/'/g, "''");

const resizeToPng = (sourcePath, outputPath, size) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (os.platform() === "darwin") {
    run("sips", [
      "-z",
      String(size),
      String(size),
      sourcePath,
      "--out",
      outputPath,
    ]);
    return;
  }

  if (os.platform() === "win32") {
    const sourceEscaped = escapePowerShellString(sourcePath);
    const outputEscaped = escapePowerShellString(outputPath);
    const command = [
      "Add-Type -AssemblyName System.Drawing",
      `$source = [System.Drawing.Image]::FromFile('${sourceEscaped}')`,
      `$bitmap = New-Object System.Drawing.Bitmap(${size}, ${size})`,
      "$graphics = [System.Drawing.Graphics]::FromImage($bitmap)",
      "$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic",
      "$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality",
      "$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality",
      "$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality",
      `$graphics.DrawImage($source, 0, 0, ${size}, ${size})`,
      `$bitmap.Save('${outputEscaped}', [System.Drawing.Imaging.ImageFormat]::Png)`,
      "$graphics.Dispose()",
      "$bitmap.Dispose()",
      "$source.Dispose()",
    ].join("; ");

    run("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command,
    ]);
    return;
  }

  throw new Error(`Unsupported platform: ${os.platform()}. Use macOS or Windows.`);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const helpRequested = args.includes("--help") || args.includes("-h");

  if (helpRequested) {
    process.stdout.write(
      [
        "Usage:",
        "  pnpm run icons:all",
        "  pnpm run icons:mac",
        "  pnpm run icons:win",
        "  pnpm run icons:all -- --src /absolute/path/to/icon.png",
        "  pnpm run icons:all -- --src-mac /abs/mac.png --src-win /abs/win.png",
        "",
        `Default mac source: ${defaultSourceMacPngPath}`,
        `Default win source: ${defaultSourceWinPngPath}`,
      ].join("\n"),
    );
    process.stdout.write("\n");
    process.exit(0);
  }

  let sourceMacPngPath = defaultSourceMacPngPath;
  let sourceWinPngPath = defaultSourceWinPngPath;
  let target = "all";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--src") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --src");
      }
      const resolved = path.resolve(nextValue);
      sourceMacPngPath = resolved;
      sourceWinPngPath = resolved;
      index += 1;
      continue;
    }

    if (arg === "--src-mac") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --src-mac");
      }
      sourceMacPngPath = path.resolve(nextValue);
      index += 1;
      continue;
    }

    if (arg === "--src-win") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --src-win");
      }
      sourceWinPngPath = path.resolve(nextValue);
      index += 1;
      continue;
    }

    if (arg === "--target") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --target");
      }
      target = nextValue;
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      continue;
    }

    const resolved = path.resolve(arg);
    sourceMacPngPath = resolved;
    sourceWinPngPath = resolved;
  }

  if (!["all", "mac", "win"].includes(target)) {
    throw new Error(`Unsupported target "${target}". Use all|mac|win.`);
  }

  return { sourceMacPngPath, sourceWinPngPath, target };
};

const writePngIco = (pngPaths, outputPath) => {
  const images = pngPaths.map((pngPath) => {
    const data = fs.readFileSync(pngPath);
    const size = Number(path.basename(pngPath).replace(".png", ""));
    return { size, data };
  });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directoryEntries = [];
  let offset = 6 + images.length * 16;

  images.forEach((image) => {
    const entry = Buffer.alloc(16);
    entry[0] = image.size >= 256 ? 0 : image.size;
    entry[1] = image.size >= 256 ? 0 : image.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.data.length;
    directoryEntries.push(entry);
  });

  const icoData = Buffer.concat([
    header,
    ...directoryEntries,
    ...images.map((image) => image.data),
  ]);

  fs.writeFileSync(outputPath, icoData);
};

const writeIcnsFromPngs = (entries, outputPath) => {
  const chunks = entries.map(({ size, pngPath }) => {
    const type = icnsTypeBySize[size];
    if (!type) {
      throw new Error(`Unsupported ICNS size: ${size}`);
    }

    const pngData = fs.readFileSync(pngPath);
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(type, 0, 4, "ascii");
    chunkHeader.writeUInt32BE(pngData.length + 8, 4);

    return Buffer.concat([chunkHeader, pngData]);
  });

  const totalSize = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const fileHeader = Buffer.alloc(8);
  fileHeader.write("icns", 0, 4, "ascii");
  fileHeader.writeUInt32BE(totalSize, 4);

  fs.writeFileSync(outputPath, Buffer.concat([fileHeader, ...chunks]));
};

const buildRuntimePng = (sourcePngPath) => {
  resizeToPng(sourcePngPath, runtimePngPath, 1024);
};

const buildWinIco = (sourcePngPath) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lioralang-ico-"));

  try {
    const normalizedSourcePath = path.join(tempDir, "source-1024.png");
    // Normalize source first to improve consistency of downscaled mip levels.
    resizeToPng(sourcePngPath, normalizedSourcePath, 1024);

    const entries = icoSizes.map((size) => ({
      size,
      outputPath: path.join(tempDir, `${size}.png`),
    }));

    entries.forEach((entry) => {
      resizeToPng(normalizedSourcePath, entry.outputPath, entry.size);
    });
    writePngIco(entries.map((entry) => entry.outputPath), winIcoPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const buildMacIcns = (sourcePngPath) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lioralang-icns-"));

  try {
    const entries = icnsSizes.map((size) => ({
      size,
      outputPath: path.join(tempDir, `${size}.png`),
    }));

    entries.forEach((entry) => {
      resizeToPng(sourcePngPath, entry.outputPath, entry.size);
    });
    writeIcnsFromPngs(
      entries.map((entry) => ({ size: entry.size, pngPath: entry.outputPath })),
      macIcnsPath,
    );
    fs.copyFileSync(macIcnsPath, savedMacIcnsSourcePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const main = () => {
  const { sourceMacPngPath, sourceWinPngPath, target } = parseArgs();

  if (target === "mac") {
    assertFileExists(sourceMacPngPath);
    buildRuntimePng(sourceMacPngPath);
    buildMacIcns(sourceMacPngPath);
  }

  if (target === "win") {
    assertFileExists(sourceWinPngPath);
    buildRuntimePng(sourceWinPngPath);
    buildWinIco(sourceWinPngPath);
  }

  if (target === "all") {
    assertFileExists(sourceMacPngPath);
    assertFileExists(sourceWinPngPath);
    const runtimeSourcePath =
      os.platform() === "win32" ? sourceWinPngPath : sourceMacPngPath;
    buildRuntimePng(runtimeSourcePath);
    buildMacIcns(sourceMacPngPath);
    buildWinIco(sourceWinPngPath);
  }

  process.stdout.write("Icons built successfully:\n");
  process.stdout.write(`- target: ${target}\n`);
  process.stdout.write(`- mac source: ${sourceMacPngPath}\n`);
  process.stdout.write(`- win source: ${sourceWinPngPath}\n`);
  process.stdout.write(`- ${runtimePngPath}\n`);
  if (target === "all" || target === "win") {
    process.stdout.write(`- ${winIcoPath}\n`);
  }
  if (target === "all" || target === "mac") {
    process.stdout.write(`- ${macIcnsPath}\n`);
    process.stdout.write(`- ${savedMacIcnsSourcePath}\n`);
  }
};

main();
