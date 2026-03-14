/* global __APP_TARGET__ */
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@app";
import { PlatformProvider } from "@app/providers";

const isWebTarget = __APP_TARGET__ === "web";
const Analytics = isWebTarget
  ? lazy(() =>
      import("@vercel/analytics/react").then((module) => ({
        default: module.Analytics,
      })),
    )
  : null;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isWebTarget && Analytics ? (
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    ) : null}
    <PlatformProvider>
      <App />
    </PlatformProvider>
  </StrictMode>,
);
