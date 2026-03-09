import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { App } from "@app";
import { PlatformProvider } from "@app/providers";
import { preloadRoutesForOffline } from "@app/router/preloadRoutesForOffline";
import { registerWebPwa } from "@shared/lib/pwa";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Analytics />
    <PlatformProvider>
      <App />
    </PlatformProvider>
  </StrictMode>,
);

void registerWebPwa();
preloadRoutesForOffline();
