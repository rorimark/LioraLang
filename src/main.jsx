/* global __APP_TARGET__ */
import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@app";
import { PlatformProvider } from "@shared/providers";
import { isSupportedLocale, prepareInitialLocale } from "@shared/lib/i18n";
import { discardPrerenderedLanding } from "@shared/lib/seo";

const isWebTarget = __APP_TARGET__ === "web";
const shouldRenderAnalytics = isWebTarget && !import.meta.env.DEV;
const Analytics = shouldRenderAnalytics
  ? lazy(() =>
      import("@vercel/analytics/react").then((module) => ({
        default: module.Analytics,
      })),
    )
  : null;

// The landing's addresses: / and /ru, /de… Only they keep the static copy
// of the landing until the live one is ready; anywhere else (an offline
// start can be served the landing's HTML) it goes at once.
const isLandingPath = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 0 || (segments.length === 1 && isSupportedLocale(segments[0]));
};

if (!isLandingPath(window.location.pathname)) {
  discardPrerenderedLanding();
}

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
