import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLATFORM_TARGETS = {
  desktop: "desktop",
  web: "web",
};

const resolvePlatformTarget = (mode) => {
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
    ? path.resolve(__dirname, "src/shared/platform/target/web.js")
    : path.resolve(__dirname, "src/shared/platform/target/desktop.js");

const resolveRouterRoutesAliasPath = (target) =>
  target === PLATFORM_TARGETS.web
    ? path.resolve(__dirname, "src/app/router/routes.web.jsx")
    : path.resolve(__dirname, "src/app/router/routes.desktop.jsx");

export default defineConfig(({ mode }) => {
  const platformTarget = resolvePlatformTarget(mode);
  const isWebTarget = platformTarget === PLATFORM_TARGETS.web;

  return {
    base: "./",
    plugins: [react()],
    build: {
      manifest: isWebTarget ? "asset-manifest.json" : false,
    },
    define: {
      __APP_TARGET__: JSON.stringify(platformTarget),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@app": path.resolve(__dirname, "src/app"),
        "@pages": path.resolve(__dirname, "src/pages"),
        "@widgets": path.resolve(__dirname, "src/widgets"),
        "@features": path.resolve(__dirname, "src/features"),
        "@entities": path.resolve(__dirname, "src/entities"),
        "@shared": path.resolve(__dirname, "src/shared"),
        "@platform": path.resolve(__dirname, "src/shared/platform"),
        "@platform-target": resolvePlatformTargetAliasPath(platformTarget),
        "@app-router-routes": resolveRouterRoutesAliasPath(platformTarget),
      },
    },
  };
});
