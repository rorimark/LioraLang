export const createMainState = ({
  initialPreferences,
  stableWindowTitle = "LioraLang",
  betaWindowTitle = "LioraLang (Beta)",
}) => {
  let mainWindow = null;
  let isQuitRequested = false;
  let appPreferences = initialPreferences;

  const getMainWindow = () => mainWindow;
  const setMainWindow = (nextWindow) => {
    mainWindow = nextWindow;
    return mainWindow;
  };

  const getAppPreferences = () => appPreferences;
  const setAppPreferences = (nextPreferences) => {
    appPreferences = nextPreferences;
    return appPreferences;
  };

  const getIsQuitRequested = () => isQuitRequested;
  const requestQuit = () => {
    isQuitRequested = true;
    return isQuitRequested;
  };

  const getStudySessionPreferences = () => getAppPreferences().studySession;
  const getDataSafetyPreferences = () => getAppPreferences().dataSafety;
  const getDesktopPreferences = () => getAppPreferences().desktop;
  const getPrivacyPreferences = () => getAppPreferences().privacy;

  const getWindowTitle = () => {
    return getDesktopPreferences().updateChannel === "beta"
      ? betaWindowTitle
      : stableWindowTitle;
  };

  const isDeveloperModeEnabled = () => Boolean(getDesktopPreferences().devMode);
  const getMinimizeToTray = () => Boolean(getDesktopPreferences().minimizeToTray);
  const getLaunchAtStartup = () => Boolean(getDesktopPreferences().launchAtStartup);
  const getUpdateChannel = () => getDesktopPreferences().updateChannel || "stable";
  const getAnalyticsEnabled = () => Boolean(getPrivacyPreferences().analyticsEnabled);
  const getCrashReportsEnabled = () => Boolean(getPrivacyPreferences().crashReportsEnabled);
  const getLogLevel = () => getPrivacyPreferences().logLevel;
  const shouldEnableHardwareAcceleration = () =>
    Boolean(getDesktopPreferences().hardwareAcceleration);

  return {
    getMainWindow,
    setMainWindow,
    getAppPreferences,
    setAppPreferences,
    getIsQuitRequested,
    requestQuit,
    getStudySessionPreferences,
    getDataSafetyPreferences,
    getDesktopPreferences,
    getPrivacyPreferences,
    getWindowTitle,
    isDeveloperModeEnabled,
    getMinimizeToTray,
    getLaunchAtStartup,
    getUpdateChannel,
    getAnalyticsEnabled,
    getCrashReportsEnabled,
    getLogLevel,
    shouldEnableHardwareAcceleration,
  };
};
