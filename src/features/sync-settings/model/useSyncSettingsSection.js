import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlatformService } from "@shared/providers";

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

const formatTimestamp = (value) => {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const useSyncSettingsSection = () => {
  const syncRepository = usePlatformService("syncRepository");
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [isRunningNow, setIsRunningNow] = useState(false);

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

  const summary = useMemo(() => {
    if (!status.configured) {
      return {
        label: "Unavailable",
        tone: "muted",
        text: "Supabase config is missing, so cross-device sync is off.",
      };
    }

    if (!status.signedIn) {
      return {
        label: "Guest mode",
        tone: "muted",
        text: "Sign in to sync your library and study progress across devices.",
      };
    }

    if (!status.online) {
      return {
        label: "Offline",
        tone: "warning",
        text: "Local changes stay safe here and will sync automatically when you're back online.",
      };
    }

    if (status.lastErrorMessage) {
      return {
        label: "Needs attention",
        tone: "danger",
        text: status.lastErrorMessage,
      };
    }

    if (status.syncing || isRunningNow) {
      return {
        label: "Syncing",
        tone: "accent",
        text: status.lastSummary || "Checking for deck and progress changes…",
      };
    }

    return {
      label: "Synced",
      tone: "success",
      text:
        status.lastSummary ||
        "Local data and cloud state are aligned. New changes will keep syncing in the background.",
    };
  }, [isRunningNow, status]);

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
    canSyncNow: status.configured && status.signedIn && !isRunningNow && !status.syncing,
    formatTimestamp,
    lastCompletedSyncAt,
  };
};
