export const createDesktopRuntimeManager = ({
  app,
  Menu,
  Tray,
  appIconPath,
  getMainWindow,
  getWindowTitle,
  getMinimizeToTray,
  getLaunchAtStartup,
  logWarn,
  onQuitRequested,
}) => {
  let appTray = null;
  let launchAtStartupSignature = null;

  const showMainWindow = () => {
    const mainWindow = getMainWindow();

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();
  };

  const destroyTray = () => {
    if (!appTray) {
      return;
    }

    appTray.destroy();
    appTray = null;
  };

  const ensureTray = () => {
    if (appTray) {
      return appTray;
    }

    const tray = new Tray(appIconPath);
    tray.setToolTip("LioraLang");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Show LioraLang",
          click: () => {
            showMainWindow();
          },
        },
        {
          type: "separator",
        },
        {
          label: "Quit",
          click: () => {
            onQuitRequested();
            app.quit();
          },
        },
      ]),
    );
    tray.on("click", () => {
      showMainWindow();
    });
    appTray = tray;

    return appTray;
  };

  const syncTrayMode = () => {
    if (getMinimizeToTray()) {
      ensureTray();
      return;
    }

    destroyTray();
  };

  const syncLaunchAtStartupSetting = () => {
    if (!app.isPackaged) {
      launchAtStartupSignature = null;
      return;
    }

    const openAtLogin = Boolean(getLaunchAtStartup());
    const nextSignature = String(openAtLogin);

    if (launchAtStartupSignature === nextSignature) {
      return;
    }

    try {
      app.setLoginItemSettings({ openAtLogin });
      launchAtStartupSignature = nextSignature;
    } catch (error) {
      logWarn("Failed to apply launch-at-startup setting", error);
    }
  };

  const syncWindowTitle = () => {
    const mainWindow = getMainWindow();

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.setTitle(getWindowTitle());
  };

  return {
    showMainWindow,
    destroyTray,
    ensureTray,
    syncTrayMode,
    syncLaunchAtStartupSetting,
    syncWindowTitle,
  };
};
