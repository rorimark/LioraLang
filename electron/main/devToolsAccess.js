import process from "node:process";

export const createDevToolsAccessManager = ({
  BrowserWindow,
  toCleanString,
  isDeveloperModeEnabled,
  onQuitShortcut,
}) => {
  const isDevToolsShortcut = (input = {}) => {
    const inputType = toCleanString(input?.type);

    if (inputType !== "keyDown" && inputType !== "rawKeyDown") {
      return false;
    }

    const code = toCleanString(input?.code);
    const key = toCleanString(input?.key).toLowerCase();
    const isF12 = code === "F12";
    const isDevToolsLetter =
      code === "KeyI" || code === "KeyJ" || code === "KeyC" ||
      key === "i" || key === "j" || key === "c";
    const hasPrimaryModifier =
      process.platform === "darwin"
        ? Boolean(input?.meta)
        : Boolean(input?.control);
    const hasSecondaryModifier =
      process.platform === "darwin"
        ? Boolean(input?.alt)
        : Boolean(input?.shift);

    return isF12 || (isDevToolsLetter && hasPrimaryModifier && hasSecondaryModifier);
  };

  const isQuitShortcut = (input = {}) => {
    const inputType = toCleanString(input?.type);

    if (inputType !== "keyDown" && inputType !== "rawKeyDown") {
      return false;
    }

    const code = toCleanString(input?.code);
    const key = toCleanString(input?.key).toLowerCase();

    if (process.platform === "darwin") {
      return (code === "KeyQ" || key === "q") && Boolean(input?.meta);
    }

    return (code === "F4" || key === "f4") && Boolean(input?.alt);
  };

  const toggleWindowDevTools = (targetWindow) => {
    if (!targetWindow || targetWindow.isDestroyed()) {
      return;
    }

    const webContents = targetWindow.webContents;

    if (!webContents || webContents.isDestroyed()) {
      return;
    }

    if (webContents.isDevToolsOpened()) {
      webContents.closeDevTools();
      return;
    }

    webContents.openDevTools({ mode: "detach", activate: true });
  };

  const closeAllDevToolsIfDisabled = () => {
    if (isDeveloperModeEnabled()) {
      return;
    }

    BrowserWindow.getAllWindows().forEach((targetWindow) => {
      const webContents = targetWindow?.webContents;

      if (webContents && webContents.isDevToolsOpened()) {
        webContents.closeDevTools();
      }
    });
  };

  const attachDevToolsAccessControl = (targetWindow) => {
    if (!targetWindow || targetWindow.isDestroyed()) {
      return;
    }

    const webContents = targetWindow.webContents;

    if (!webContents || webContents.isDestroyed()) {
      return;
    }

    webContents.on("before-input-event", (event, input) => {
      if (isQuitShortcut(input)) {
        event.preventDefault();
        onQuitShortcut();
        return;
      }

      if (!isDevToolsShortcut(input)) {
        return;
      }

      event.preventDefault();

      if (!isDeveloperModeEnabled()) {
        closeAllDevToolsIfDisabled();
        return;
      }

      toggleWindowDevTools(targetWindow);
    });

    webContents.on("devtools-opened", () => {
      if (!isDeveloperModeEnabled()) {
        webContents.closeDevTools();
      }
    });
  };

  return {
    attachDevToolsAccessControl,
    closeAllDevToolsIfDisabled,
  };
};
