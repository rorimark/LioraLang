export const registerUpdateIpcHandlers = ({ ipcMain, updaterManager }) => {
  ipcMain.handle("updates:check", async () => {
    return updaterManager.checkForUpdates();
  });

  ipcMain.handle("updates:download", async () => {
    return updaterManager.downloadUpdate();
  });
};
