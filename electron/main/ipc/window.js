export const registerWindowIpcHandlers = ({
  ipcMain,
  BrowserWindow,
  getMainWindow,
  navigationManager,
  applyWindowTitleBarTheme,
}) => {
  const getActiveWindow = () => BrowserWindow.getFocusedWindow() || getMainWindow();

  ipcMain.handle("window:get-history-state", () => {
    const activeWindow = getActiveWindow();

    if (!activeWindow) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    const webContents = activeWindow.webContents;

    return {
      canGoBack: navigationManager.canNavigateBack(webContents),
      canGoForward: navigationManager.canNavigateForward(webContents),
    };
  });

  ipcMain.handle("window:navigate-back", () => {
    const activeWindow = getActiveWindow();

    if (!activeWindow) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    const webContents = activeWindow.webContents;

    if (navigationManager.canNavigateBack(webContents)) {
      navigationManager.navigateBack(webContents);
    }

    return {
      canGoBack: navigationManager.canNavigateBack(webContents),
      canGoForward: navigationManager.canNavigateForward(webContents),
    };
  });

  ipcMain.handle("window:navigate-forward", () => {
    const activeWindow = getActiveWindow();

    if (!activeWindow) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    const webContents = activeWindow.webContents;

    if (navigationManager.canNavigateForward(webContents)) {
      navigationManager.navigateForward(webContents);
    }

    return {
      canGoBack: navigationManager.canNavigateBack(webContents),
      canGoForward: navigationManager.canNavigateForward(webContents),
    };
  });

  ipcMain.handle("window:apply-theme", (_, payload) => {
    const activeWindow = getActiveWindow();
    const applied = applyWindowTitleBarTheme(activeWindow, payload?.theme);

    return { applied };
  });
};
