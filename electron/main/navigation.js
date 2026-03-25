const DEFAULT_MAX_PENDING_NAVIGATION_REQUESTS = 20;

export const createNavigationManager = ({
  getMainWindow,
  showMainWindow,
  settingsRoutePath,
  toCleanString,
}) => {
  let pendingNavigationRequests = [];

  const normalizeNavigationRoute = (value) => {
    if (typeof value !== "string") {
      return "";
    }

    const normalizedValue = value.trim();

    if (!normalizedValue || !normalizedValue.startsWith("/")) {
      return "";
    }

    return normalizedValue;
  };

  const normalizeNavigationRequest = (request) => {
    if (typeof request === "string") {
      const to = normalizeNavigationRoute(request);

      if (!to) {
        return null;
      }

      return { to };
    }

    if (!request || typeof request !== "object") {
      return null;
    }

    const to = normalizeNavigationRoute(request.to);

    if (!to) {
      return null;
    }

    const source = toCleanString(request.source);
    const settingsTab = toCleanString(request.settingsTab);
    const highlightToken = Number(request.highlightToken);

    return {
      to,
      source,
      settingsTab,
      highlightToken: Number.isFinite(highlightToken) ? highlightToken : 0,
    };
  };

  const flushPendingNavigationRequests = () => {
    const mainWindow = getMainWindow();

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (mainWindow.webContents.isLoadingMainFrame()) {
      return;
    }

    if (pendingNavigationRequests.length === 0) {
      return;
    }

    const requestsToSend = pendingNavigationRequests;
    pendingNavigationRequests = [];

    requestsToSend.forEach((request) => {
      mainWindow.webContents.send("app:navigate", request);
    });
  };

  const queueNavigationRequest = (request) => {
    const normalizedRequest = normalizeNavigationRequest(request);

    if (!normalizedRequest) {
      return;
    }

    pendingNavigationRequests.push(normalizedRequest);

    if (pendingNavigationRequests.length > DEFAULT_MAX_PENDING_NAVIGATION_REQUESTS) {
      pendingNavigationRequests = pendingNavigationRequests.slice(
        -DEFAULT_MAX_PENDING_NAVIGATION_REQUESTS,
      );
    }

    flushPendingNavigationRequests();
  };

  const buildSettingsRoute = (tabKey, sectionId) => {
    const safeTabKey = toCleanString(tabKey) || "general";
    const safeSectionId = toCleanString(sectionId);
    const encodedTabKey = encodeURIComponent(safeTabKey);
    const encodedSectionId = safeSectionId ? encodeURIComponent(safeSectionId) : "";
    const routeQuery = `${settingsRoutePath}?tab=${encodedTabKey}`;

    if (!encodedSectionId) {
      return routeQuery;
    }

    return `${routeQuery}#${encodedSectionId}`;
  };

  const requestSettingsSectionFromMenu = (
    tabKey,
    sectionId,
    { highlight = true } = {},
  ) => {
    showMainWindow();
    const to = buildSettingsRoute(tabKey, sectionId);

    if (!highlight) {
      queueNavigationRequest(to);
      return;
    }

    queueNavigationRequest({
      to,
      source: "app-menu",
      settingsTab: tabKey,
      highlightToken: Date.now(),
    });
  };

  const canNavigateBack = (webContents) => {
    if (!webContents || typeof webContents.navigationHistory?.canGoBack !== "function") {
      return false;
    }

    return webContents.navigationHistory.canGoBack();
  };

  const canNavigateForward = (webContents) => {
    if (!webContents || typeof webContents.navigationHistory?.canGoForward !== "function") {
      return false;
    }

    return webContents.navigationHistory.canGoForward();
  };

  const navigateBack = (webContents) => {
    if (!webContents || typeof webContents.navigationHistory?.goBack !== "function") {
      return;
    }

    webContents.navigationHistory.goBack();
  };

  const navigateForward = (webContents) => {
    if (!webContents || typeof webContents.navigationHistory?.goForward !== "function") {
      return;
    }

    webContents.navigationHistory.goForward();
  };

  return {
    flushPendingNavigationRequests,
    queueNavigationRequest,
    buildSettingsRoute,
    requestSettingsSectionFromMenu,
    canNavigateBack,
    canNavigateForward,
    navigateBack,
    navigateForward,
  };
};
