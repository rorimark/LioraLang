import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { useI18n } from "@shared/lib/i18n";

const DEFAULT_STATUS = Object.freeze({
  configured: false,
  signedIn: false,
  autoSync: true,
  syncOnLaunch: true,
  notifyOnError: true,
  keepLocalCopyOnConflict: true,
  online: true,
  syncing: false,
  phase: "idle",
  deviceId: "",
  deviceName: "",
  accountEmail: "",
  profileScope: "guest:default",
  pendingDeckChanges: 0,
  pendingProgressChanges: 0,
  lastSuccessfulSyncAt: "",
  lastSuccessfulPushAt: "",
  lastSuccessfulPullAt: "",
  lastErrorAt: "",
  lastErrorMessage: "",
  autoResolvedConflictsCount: 0,
  lastSummary: "",
});

export const useSyncSettingsSection = () => {
  const syncRepository = usePlatformService("syncRepository");
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const { t, formatDate } = useI18n();
  const formatTimestamp = useCallback(
    (value) => (value && formatDate(value, { dateStyle: "medium", timeStyle: "short" })) || t("sync.never"),
    [formatDate, t],
  );

  useEffect(() => {
    let isActive = true;

    syncRepository
      .getStatus()
      .then((nextStatus) => {
        if (isActive) {
          setStatus(nextStatus || DEFAULT_STATUS);
        }
      })
      .catch(() => {
        if (isActive) {
          setStatus(DEFAULT_STATUS);
        }
      });

    const unsubscribe = syncRepository.subscribe((nextStatus) => {
      if (isActive) {
        setStatus(nextStatus || DEFAULT_STATUS);
      }
    });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [syncRepository]);

  const runSyncNow = useCallback(async () => {
    setIsRunningNow(true);

    try {
      await syncRepository.runNow({ reason: "manual" });
    } finally {
      setIsRunningNow(false);
    }
  }, [syncRepository]);

  const clearError = useCallback(async () => {
    await syncRepository.clearError();
  }, [syncRepository]);

  const updatePreference = useCallback(
    async (key, value) => {
      await syncRepository.updatePreferences({
        [key]: value,
      });
    },
    [syncRepository],
  );

  const syncState = useMemo(() => {
    if (!status.configured) {
      return { state: "unavailable", tone: "muted" };
    }

    if (!status.signedIn) {
      return { state: "guest", tone: "muted" };
    }

    if (!status.online) {
      return { state: "offline", tone: "warning" };
    }

    if (status.lastErrorMessage) {
      return { state: "attention", tone: "danger" };
    }

    // The background sync runs every few seconds; it is not news. The
    // status says "Syncing" only for a sync you asked for, or for the
    // very first one, so it does not flicker while you read it.
    const hasSyncedBefore = Boolean(
      status.lastSuccessfulSyncAt || status.lastSuccessfulPullAt || status.lastSuccessfulPushAt,
    );

    if (isRunningNow || (status.syncing && !hasSyncedBefore)) {
      return { state: "syncing", tone: "accent" };
    }

    return { state: "synced", tone: "success" };
  }, [isRunningNow, status]);
  const summary = useMemo(
    () => ({
      ...syncState,
      label: t(`account.sync.${syncState.state}.label`),
      text: t(`sync.summary.${syncState.state}`),
    }),
    [syncState, t],
  );

  const lastCompletedSyncAt = useMemo(() => {
    return (
      status.lastSuccessfulSyncAt ||
      status.lastSuccessfulPullAt ||
      status.lastSuccessfulPushAt ||
      ""
    );
  }, [
    status.lastSuccessfulPullAt,
    status.lastSuccessfulPushAt,
    status.lastSuccessfulSyncAt,
  ]);

  return {
    status,
    isRunningNow,
    runSyncNow,
    clearError,
    updatePreference,
    summary,
    canSyncNow: status.configured && status.signedIn && !isRunningNow,
    formatTimestamp,
    lastCompletedSyncAt,
  };
};
