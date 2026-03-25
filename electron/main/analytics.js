export const createAnalyticsManager = ({
  app,
  fs,
  path,
  toCleanString,
  getAnalyticsEnabled,
  getUpdateChannel,
  logWarn,
}) => {
  const getAnalyticsLogFilePath = () => {
    return path.join(app.getPath("userData"), "analytics", "events.jsonl");
  };

  const trackAnalyticsEvent = (eventName, payload = {}) => {
    if (!getAnalyticsEnabled()) {
      return;
    }

    const normalizedName = toCleanString(eventName);

    if (!normalizedName) {
      return;
    }

    try {
      const logFilePath = getAnalyticsLogFilePath();
      fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
      const line = JSON.stringify({
        event: normalizedName,
        payload: payload && typeof payload === "object" ? payload : {},
        timestamp: new Date().toISOString(),
        channel: getUpdateChannel(),
        appVersion: app.getVersion(),
      });

      fs.appendFileSync(logFilePath, `${line}\n`, "utf8");
    } catch (error) {
      logWarn("Failed to write analytics event", error);
    }
  };

  return {
    trackAnalyticsEvent,
  };
};
