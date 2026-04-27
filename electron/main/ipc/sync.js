export const registerSyncIpcHandlers = ({
  ipcMain,
  getSyncRuntimeState,
  updateSyncRuntimeState,
  getSyncProfileState,
  setSyncProfileState,
  activateProgressProfile,
  ensureSyncDeviceIdentity,
  getNextDeviceSequence,
  listPendingProgressEvents,
  markProgressEventsSynced,
  applyRemoteProgressEvents,
}) => {
  ipcMain.handle("sync:get-runtime-state", () => {
    return getSyncRuntimeState();
  });

  ipcMain.handle("sync:update-runtime-state", (_, payload) => {
    return updateSyncRuntimeState(payload?.patch || {});
  });

  ipcMain.handle("sync:get-profile-state", (_, payload) => {
    return getSyncProfileState(payload?.profileScope);
  });

  ipcMain.handle("sync:set-profile-state", (_, payload) => {
    return setSyncProfileState(payload?.profileScope, payload?.patch || {});
  });

  ipcMain.handle("sync:activate-profile", (_, payload) => {
    return activateProgressProfile(payload?.profileScope);
  });

  ipcMain.handle("sync:ensure-device", (_, payload) => {
    return ensureSyncDeviceIdentity(payload || {});
  });

  ipcMain.handle("sync:next-device-seq", (_, payload) => {
    return getNextDeviceSequence(payload?.profileScope);
  });

  ipcMain.handle("sync:list-pending-progress", (_, payload) => {
    return listPendingProgressEvents(payload?.profileScope, payload?.limit);
  });

  ipcMain.handle("sync:mark-progress-synced", (_, payload) => {
    return markProgressEventsSynced(payload?.results || []);
  });

  ipcMain.handle("sync:apply-remote-progress", (_, payload) => {
    return applyRemoteProgressEvents(payload?.profileScope, payload?.events || []);
  });
};
