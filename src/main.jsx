/* global __APP_TARGET__ */
import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@app";
import { PlatformProvider } from "@shared/providers";
import { prepareInitialLocale } from "@shared/lib/i18n";

const isWebTarget = __APP_TARGET__ === "web";
const shouldRenderAnalytics = isWebTarget && !import.meta.env.DEV;
const Analytics = shouldRenderAnalytics
  ? lazy(() =>
      import("@vercel/analytics/react").then((module) => ({
        default: module.Analytics,
      })),
    )
  : null;

// The language is loaded before the first paint, so the app never shows
// a moment of English to someone who chose another language.
prepareInitialLocale().then((initialLocale) => {
  createRoot(document.getElementById("root")).render(
    <>
      {shouldRenderAnalytics && Analytics ? (
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      ) : null}
      <PlatformProvider>
        <App initialLocale={initialLocale} />
      </PlatformProvider>
    </>,
  );
});
