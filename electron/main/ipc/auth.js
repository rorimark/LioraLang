export const registerAuthIpcHandlers = ({ ipcMain, authSecureStorage }) => {
  ipcMain.handle("auth-storage:get-item", (_, key) => {
    return authSecureStorage.getItem(key);
  });

  ipcMain.handle("auth-storage:set-item", (_, payload) => {
    return authSecureStorage.setItem(payload?.key, payload?.value);
  });

  ipcMain.handle("auth-storage:remove-item", (_, key) => {
    return authSecureStorage.removeItem(key);
  });

  ipcMain.handle("auth-storage:is-encryption-available", () => {
    return authSecureStorage.isEncryptionAvailable();
  });
};
