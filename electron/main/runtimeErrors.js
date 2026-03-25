const DEFAULT_MAX_PENDING_RUNTIME_ERRORS = 20;

export const createRuntimeErrorManager = ({
  app,
  BrowserWindow,
  appIconPath,
  fatalTheme,
  getMainWindow,
  getCrashReportsEnabled,
}) => {
  let pendingRuntimeErrorEvents = [];

  const normalizeRuntimeErrorText = (value, fallback = "Unknown error") => {
    if (typeof value !== "string") {
      return fallback;
    }

    const normalizedValue = value.trim();
    return normalizedValue || fallback;
  };

  const truncateRuntimeText = (value, limit = 6000) => {
    if (typeof value !== "string") {
      return "";
    }

    if (value.length <= limit) {
      return value;
    }

    return `${value.slice(0, limit)}…`;
  };

  const resolveRuntimeErrorPresentation = (error) => {
    const message =
      typeof error?.message === "string"
        ? error.message
        : normalizeRuntimeErrorText(String(error || "Unknown error"));
    const stack = typeof error?.stack === "string" ? error.stack : "";

    if (message.includes("ZIP file not provided")) {
      return {
        title: "Update Error",
        message:
          "Update package is incomplete on the server. Please try again later.",
        details: truncateRuntimeText(`${message}\n${stack}`.trim()),
      };
    }

    return {
      title: "LioraLang Error",
      message: normalizeRuntimeErrorText(message),
      details: truncateRuntimeText(stack),
    };
  };

  const buildRuntimeErrorPayload = ({
    title,
    message,
    details = "",
    source = "main",
  } = {}) => {
    const createdAt = new Date().toISOString();

    return {
      id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: normalizeRuntimeErrorText(title, "Application error"),
      message: normalizeRuntimeErrorText(message),
      details: normalizeRuntimeErrorText(details, ""),
      source,
      createdAt,
    };
  };

  const flushPendingRuntimeErrorEvents = () => {
    const mainWindow = getMainWindow();

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (mainWindow.webContents.isLoadingMainFrame()) {
      return;
    }

    if (pendingRuntimeErrorEvents.length === 0) {
      return;
    }

    const eventsToSend = pendingRuntimeErrorEvents;
    pendingRuntimeErrorEvents = [];

    eventsToSend.forEach((payload) => {
      mainWindow.webContents.send("app:runtime-error", payload);
    });
  };

  const queueRuntimeErrorEvent = (payload) => {
    if (!payload || typeof payload !== "object") {
      return;
    }

    pendingRuntimeErrorEvents.push(payload);

    if (pendingRuntimeErrorEvents.length > DEFAULT_MAX_PENDING_RUNTIME_ERRORS) {
      pendingRuntimeErrorEvents = pendingRuntimeErrorEvents.slice(
        -DEFAULT_MAX_PENDING_RUNTIME_ERRORS,
      );
    }

    flushPendingRuntimeErrorEvents();
  };

  const reportRuntimeError = (error, source = "main") => {
    if (!getCrashReportsEnabled()) {
      return;
    }

    const presentation = resolveRuntimeErrorPresentation(error);
    const payload = buildRuntimeErrorPayload({
      title: presentation.title,
      message: presentation.message,
      details: presentation.details,
      source,
    });

    queueRuntimeErrorEvent(payload);
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const buildFatalStartupErrorHtml = (payload) => {
    const title = escapeHtml(payload?.title || "LioraLang Startup Error");
    const message = escapeHtml(payload?.message || "Unknown startup error");
    const details = escapeHtml(payload?.details || "");

    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>${title}</title>
          <style>
            :root {
              color-scheme: dark;
            }
            body {
              margin: 0;
              background: ${fatalTheme.bodyBackground};
              color: ${fatalTheme.bodyText};
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: grid;
              place-items: center;
              min-height: 100vh;
              padding: 24px;
            }
            .error-card {
              width: min(560px, 100%);
              border: 1px solid ${fatalTheme.cardBorder};
              border-radius: 14px;
              background: ${fatalTheme.cardBackground};
              box-shadow: ${fatalTheme.cardShadow};
              padding: 18px;
            }
            .error-card h1 {
              margin: 0 0 10px;
              font-size: 22px;
            }
            .error-card p {
              margin: 0;
              color: ${fatalTheme.mutedText};
              line-height: 1.4;
            }
            .error-card pre {
              margin: 12px 0 0;
              border: 1px solid ${fatalTheme.codeBorder};
              border-radius: 10px;
              background: ${fatalTheme.codeBackground};
              color: ${fatalTheme.mutedText};
              padding: 10px;
              max-height: 220px;
              overflow: auto;
              white-space: pre-wrap;
              word-break: break-word;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <article class="error-card">
            <h1>${title}</h1>
            <p>${message}</p>
            ${details ? `<pre>${details}</pre>` : ""}
          </article>
        </body>
      </html>
    `;
  };

  const openFatalStartupErrorWindow = async (payload) => {
    const fatalWindow = new BrowserWindow({
      width: 620,
      height: 420,
      minWidth: 620,
      minHeight: 420,
      resizable: false,
      maximizable: false,
      minimizable: false,
      autoHideMenuBar: true,
      show: false,
      icon: appIconPath,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    const html = buildFatalStartupErrorHtml(payload);
    await fatalWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    fatalWindow.once("ready-to-show", () => {
      fatalWindow.show();
    });
    fatalWindow.on("closed", () => {
      app.quit();
    });
  };

  return {
    buildRuntimeErrorPayload,
    flushPendingRuntimeErrorEvents,
    queueRuntimeErrorEvent,
    reportRuntimeError,
    openFatalStartupErrorWindow,
  };
};
