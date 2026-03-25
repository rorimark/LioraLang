export const createWindowBroadcast = ({ BrowserWindow }) => {
  const sendDecksUpdated = () => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("decks-updated");
    });
  };

  const sendAppSettingsUpdated = (settings) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("app-settings-updated", settings);
    });
  };

  return {
    sendDecksUpdated,
    sendAppSettingsUpdated,
  };
};
