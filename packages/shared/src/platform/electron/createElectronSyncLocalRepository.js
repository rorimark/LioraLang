const ensureElectronApi = () => {
  if (typeof window === "undefined" || !window.electronAPI) {
    throw new Error("Desktop sync is unavailable in this window. Restart the app.");
  }

  return window.electronAPI;
};

export const createElectronSyncLocalRepository = () => {
  return {
    async ensureDeviceIdentity(payload = {}) {
      return ensureElectronApi().syncEnsureDevice(payload);
    },
    async getRuntimeState() {
      return ensureElectronApi().syncGetRuntimeState();
    },
    async updateRuntimeState(patch = {}) {
      return ensureElectronApi().syncUpdateRuntimeState({ patch });
    },
    async getProfileState(profileScope) {
      return ensureElectronApi().syncGetProfileState({ profileScope });
    },
    async setProfileState(profileScope, patch = {}) {
      return ensureElectronApi().syncSetProfileState({ profileScope, patch });
    },
    async activateProfile(profileScope) {
      return ensureElectronApi().syncActivateProfile({ profileScope });
    },
    async nextDeviceSequence(profileScope) {
      return ensureElectronApi().syncNextDeviceSeq({ profileScope });
    },
    async listPendingProgressEvents(profileScope, limit) {
      return ensureElectronApi().syncListPendingProgress({ profileScope, limit });
    },
    async markProgressEventsSynced(results = []) {
      return ensureElectronApi().syncMarkProgressSynced({ results });
    },
    async applyRemoteProgressEvents(profileScope, events = []) {
      return ensureElectronApi().syncApplyRemoteProgress({ profileScope, events });
    },
  };
};
