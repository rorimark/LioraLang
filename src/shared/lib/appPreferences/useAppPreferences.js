import { useCallback, useEffect, useState } from "react";
import { desktopApi } from "@shared/api";
import {
  APP_PREFERENCES_APP_KEY,
  DEFAULT_APP_PREFERENCES,
  mergeAppPreferences,
  normalizeAppPreferences,
} from "./appPreferences";

export const useAppPreferences = () => {
  const [appPreferences, setAppPreferences] = useState(DEFAULT_APP_PREFERENCES);

  useEffect(() => {
    let cancelled = false;

    desktopApi
      .getAppSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        setAppPreferences(
          normalizeAppPreferences(settings?.[APP_PREFERENCES_APP_KEY]),
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setAppPreferences(DEFAULT_APP_PREFERENCES);
      });

    const unsubscribe = desktopApi.subscribeAppSettingsUpdated((nextSettings) => {
      setAppPreferences(
        normalizeAppPreferences(nextSettings?.[APP_PREFERENCES_APP_KEY]),
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const updateAppPreferences = useCallback((patch) => {
    setAppPreferences((currentValue) => {
      const nextPreferences = mergeAppPreferences(currentValue, patch);

      void desktopApi
        .updateAppSettings({
          [APP_PREFERENCES_APP_KEY]: nextPreferences,
        })
        .catch(() => {});

      return nextPreferences;
    });
  }, []);

  return {
    appPreferences,
    updateAppPreferences,
  };
};
