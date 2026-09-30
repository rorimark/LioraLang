// Pictures between the window and the database. Bytes cross as typed
// arrays; the main process names and checks them, never the window.
const MAX_IDS_PER_CALL = 5_000;

const toIdList = (value) =>
  (Array.isArray(value) ? value : []).filter((id) => typeof id === "string").slice(0, MAX_IDS_PER_CALL);

export const registerMediaIpcHandlers = ({ ipcMain, mediaServices }) => {
  ipcMain.handle("media:save-image", (_, payload) => mediaServices.saveImage(payload || {}));

  ipcMain.handle("media:get-image", (_, payload) =>
    mediaServices.getImage(String(payload?.assetId || ""), payload?.variant === "thumb" ? "thumb" : "full"),
  );

  ipcMain.handle("media:save-thumbnail", (_, payload) =>
    mediaServices.saveThumbnail(String(payload?.assetId || ""), payload?.thumb || null),
  );

  ipcMain.handle("media:find-missing", (_, assetIds) => mediaServices.findMissingMedia(toIdList(assetIds)));

  ipcMain.handle("media:store-remote-image", (_, payload) =>
    mediaServices.storeRemoteImage(String(payload?.assetId || ""), payload?.bytes),
  );
};
