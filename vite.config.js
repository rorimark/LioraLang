import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLATFORM_TARGETS = {
  desktop: "desktop",
  web: "web",
};

const resolvePlatformTarget = (mode) => {
  if (mode === "test") {
    return PLATFORM_TARGETS.web;
  }

  const env = loadEnv(mode, __dirname, "");
  const requestedTarget =
    typeof env.VITE_APP_TARGET === "string"
      ? env.VITE_APP_TARGET.trim().toLowerCase()
      : "";

  if (requestedTarget === PLATFORM_TARGETS.web) {
    return PLATFORM_TARGETS.web;
  }

  return PLATFORM_TARGETS.desktop;
};

const resolvePlatformTargetAliasPath = (target) =>
  target === PLATFORM_TARGETS.web
    ? path.resolve(__dirname, "packages/shared/src/platform/target/web.js")
    : path.resolve(__dirname, "packages/shared/src/platform/target/desktop.js");

const resolveRouterRoutesAliasPath = (target) =>
  target === PLATFORM_TARGETS.web
    ? path.resolve(__dirname, "src/app/router/routes.web.jsx")
    : path.resolve(__dirname, "src/app/router/routes.desktop.jsx");

export default defineConfig(({ mode }) => {
  const platformTarget = resolvePlatformTarget(mode);
  const isWebTarget = platformTarget === PLATFORM_TARGETS.web;
  const packageJson = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
  );
  const appVersion = String(packageJson?.version || "0.0.0");

  return {
    base: isWebTarget ? "/" : "./",
    plugins: [react()],
    build: {
      manifest: isWebTarget ? "asset-manifest.json" : false,
    },
    test: {
      environment: "jsdom",
      setupFiles: path.resolve(__dirname, "vitest.setup.js"),
      globals: true,
      css: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/**/*.{js,jsx}", "packages/shared/src/**/*.{js,jsx}"],
        exclude: [
          "src/main.jsx",
          "src/**/*.test.{js,jsx}",
          "src/**/*.spec.{js,jsx}",
        ],
      },
    },
    define: {
      __APP_TARGET__: JSON.stringify(platformTarget),
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@app": path.resolve(__dirname, "src/app"),
        "@pages": path.resolve(__dirname, "src/pages"),
        "@widgets": path.resolve(__dirname, "src/widgets"),
        "@features": path.resolve(__dirname, "src/features"),
        "@entities": path.resolve(__dirname, "src/entities"),
        "@shared": path.resolve(__dirname, "packages/shared/src"),
        "@platform": path.resolve(__dirname, "packages/shared/src/platform"),
        "@platform-target": resolvePlatformTargetAliasPath(platformTarget),
        "@app-router-routes": resolveRouterRoutesAliasPath(platformTarget),
      },
    },
  };
});
