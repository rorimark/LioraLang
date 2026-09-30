import { createOAuthLoopback } from "../oauthLoopback.js";

export const registerAuthIpcHandlers = ({
  ipcMain,
  authSecureStorage,
  shell,
  showMainWindow,
  getTranslator,
}) => {
  const oauth = createOAuthLoopback({
    shell,
    showMainWindow,
    translate: (key) => (typeof getTranslator === "function" ? getTranslator()(key) : key),
  });

  // Google and GitHub sign-in: open the one-time return address, then the
  // provider's page, and hand the code back to the window.
  ipcMain.handle("auth-oauth:prepare", async () => {
    try {
      return await oauth.prepare();
    } catch (error) {
      return { error: error?.code || "social_failed" };
    }
  });

  ipcMain.handle("auth-oauth:await-code", (_, authorizeUrl) => oauth.awaitCode(authorizeUrl));

  ipcMain.handle("auth-oauth:cancel", () => {
    oauth.cancel();
  });

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
