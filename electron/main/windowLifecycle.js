import process from "node:process";

export const createWindowLifecycle = ({
  app,
  BrowserWindow,
  preloadPath,
  distIndexPath,
  appIconPath,
  windowTitleBarHeight,
  getWindowTitle,
  getWindowTitleBarTheme,
  getDevServerUrl,
  getIsQuitRequested,
  getMinimizeToTray,
  setMainWindow,
  ensureTray,
  attachDevToolsAccessControl,
  flushPendingImportFileRequests,
  flushPendingRuntimeErrorEvents,
  flushPendingNavigationRequests,
}) => {
  const flushPendingStartupEvents = () => {
    flushPendingImportFileRequests();
    flushPendingRuntimeErrorEvents();
    flushPendingNavigationRequests();
  };

  const createWindow = async () => {
    const isMac = process.platform === "darwin";
    const windowTheme = getWindowTitleBarTheme();
    const mainWindow = new BrowserWindow({
      width: 1300,
      height: 840,
      minWidth: 1024,
      minHeight: 700,
      icon: appIconPath,
      show: false,
      autoHideMenuBar: true,
      title: getWindowTitle(),
      titleBarStyle: isMac ? "hiddenInset" : "hidden",
      ...(isMac
        ? {}
        : {
            titleBarOverlay: {
              color: windowTheme.color,
              symbolColor: windowTheme.symbolColor,
              height: windowTitleBarHeight,
            },
          }),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: preloadPath,
      },
    });

    setMainWindow(mainWindow);
    attachDevToolsAccessControl(mainWindow);

    mainWindow.on("close", (event) => {
      if (getIsQuitRequested() || !getMinimizeToTray()) {
        return;
      }

      event.preventDefault();
      mainWindow.hide();
      ensureTray();
    });

    mainWindow.on("minimize", (event) => {
      if (!getMinimizeToTray()) {
        return;
      }

      event.preventDefault();
      mainWindow.hide();
      ensureTray();
    });

    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
      flushPendingStartupEvents();
    });

    mainWindow.webContents.on("did-finish-load", () => {
      flushPendingStartupEvents();
    });

    mainWindow.on("closed", () => {
      if (mainWindow.isDestroyed()) {
        setMainWindow(null);
      }
    });

    if (!app.isPackaged) {
      await mainWindow.loadURL(getDevServerUrl());
      return mainWindow;
    }

    await mainWindow.loadFile(distIndexPath);
    return mainWindow;
  };

  return {
    createWindow,
  };
};
