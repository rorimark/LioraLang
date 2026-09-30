import http from "node:http";

// Google and GitHub sign-in for the desktop app, the way native apps do it
// (RFC 8252): the provider's page opens in the system browser, and after
// sign-in the browser returns to a one-time address on this computer that
// only the app is listening on. The code it brings is useless without the
// PKCE secret the app keeps, so nothing else can finish the sign-in.
//
// The address has to be allowed in Supabase (Authentication > URL
// Configuration > Redirect URLs): http://127.0.0.1:47163/auth/callback

export const OAUTH_LOOPBACK_HOST = "127.0.0.1";
export const OAUTH_LOOPBACK_PORT = 47163;
export const OAUTH_CALLBACK_PATH = "/auth/callback";
const WAIT_MS = 5 * 60_000;

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const page = ({ lang, title, text }) => `<!doctype html>
<html${lang ? ` lang="${escapeHtml(lang)}"` : ""}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #f4f6fb; color: #28303f; }
  @media (prefers-color-scheme: dark) { body { background: #0f1a2d; color: #eef3ff; } }
  main { max-width: 420px; padding: 32px; text-align: center; }
  h1 { margin: 0 0 8px; font-size: 1.4rem; }
  p { margin: 0; opacity: 0.8; }
</style></head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p></main></body></html>`;

// The sign-in page may only be Supabase's authorize endpoint, so the app
// never opens an arbitrary address it was handed.
export const isSupabaseAuthorizeUrl = (value) => {
  try {
    const url = new URL(String(value));
    return (
      url.protocol === "https:" &&
      /\.supabase\.(co|in)$/.test(url.hostname) &&
      url.pathname === "/auth/v1/authorize"
    );
  } catch {
    return false;
  }
};

export const createOAuthLoopback = ({ shell, showMainWindow, translate = (key) => key, getLocale = () => "" }) => {
  let pending = null;

  const finish = (outcome) => {
    if (!pending) {
      return;
    }

    const { server, timer, resolve } = pending;
    pending = null;
    clearTimeout(timer);
    server.close();
    resolve(outcome);
  };

  // Opens the one-time address and returns it, before the sign-in URL is
  // built; a sign-in already waiting is cancelled.
  const prepare = () =>
    new Promise((resolve, reject) => {
      finish({ error: "cancelled" });

      let settle = () => {};
      const outcome = new Promise((done) => {
        settle = done;
      });

      const server = http.createServer((request, response) => {
        const url = new URL(request.url || "/", `http://${OAUTH_LOOPBACK_HOST}`);

        if (request.method !== "GET" || url.pathname !== OAUTH_CALLBACK_PATH) {
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not found");
          return;
        }

        const code = url.searchParams.get("code") || "";
        const error = url.searchParams.get("error_description") || url.searchParams.get("error") || "";
        const ok = Boolean(code) && !error;

        response.writeHead(ok ? 200 : 400, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(
          page({
            lang: getLocale(),
            title: translate(ok ? "desktop.oauth.doneTitle" : "desktop.oauth.failedTitle"),
            text: translate(ok ? "desktop.oauth.doneText" : "desktop.oauth.failedText"),
          }),
        );

        showMainWindow?.();
        finish(ok ? { code } : { error: error || "no_code" });
      });

      server.once("error", (error) => {
        reject(Object.assign(new Error(error?.message || "listen failed"), { code: error?.code === "EADDRINUSE" ? "social_port_busy" : "social_failed" }));
      });

      server.listen(OAUTH_LOOPBACK_PORT, OAUTH_LOOPBACK_HOST, () => {
        pending = {
          server,
          resolve: settle,
          outcome,
          timer: setTimeout(() => finish({ error: "timeout" }), WAIT_MS),
        };
        resolve({ redirectTo: `http://${OAUTH_LOOPBACK_HOST}:${OAUTH_LOOPBACK_PORT}${OAUTH_CALLBACK_PATH}` });
      });
    });

  // Opens the provider's page in the system browser and waits for the
  // browser to come back with a code, an error, or not at all.
  const awaitCode = async (authorizeUrl) => {
    if (!pending) {
      return { error: "not_prepared" };
    }

    if (!isSupabaseAuthorizeUrl(authorizeUrl)) {
      finish({ error: "invalid_url" });
      return { error: "invalid_url" };
    }

    const { outcome } = pending;
    await shell.openExternal(authorizeUrl);
    return outcome;
  };

  return { prepare, awaitCode, cancel: () => finish({ error: "cancelled" }) };
};
