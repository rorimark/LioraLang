export const createContentSecurityPolicyManager = ({
  app,
  session,
  getDevServerUrl,
  getTrustedRemoteConnectSources,
}) => {
  const buildContentSecurityPolicy = () => {
    const joinConnectSources = (sources = []) => {
      return [...new Set(["'self'", ...sources])].join(" ");
    };

    const trustedRemoteConnectSources = getTrustedRemoteConnectSources();

    if (app.isPackaged) {
      return [
        "default-src 'self'",
        "script-src 'self'",
        "worker-src 'self' blob:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob:",
        "font-src 'self' https://fonts.gstatic.com data:",
        `connect-src ${joinConnectSources(trustedRemoteConnectSources)}`,
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
      ].join("; ");
    }

    const devServerUrl = getDevServerUrl();
    const devOrigin = new URL(devServerUrl).origin;
    const devWsOrigin =
      `${devServerUrl.startsWith("https://") ? "wss" : "ws"}://${new URL(devServerUrl).host}`;

    return [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${devOrigin}`,
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      `connect-src ${joinConnectSources([
        devOrigin,
        devWsOrigin,
        ...trustedRemoteConnectSources,
      ])}`,
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
  };

  const setupContentSecurityPolicy = () => {
    const policy = buildContentSecurityPolicy();

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [policy],
        },
      });
    });
  };

  return {
    setupContentSecurityPolicy,
  };
};
