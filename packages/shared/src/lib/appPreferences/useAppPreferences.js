import { useCallback, useEffect, useState } from "react";
import { usePlatformService } from "@shared/providers";
import {
  DEFAULT_APP_PREFERENCES,
  mergeAppPreferences,
  normalizeAppPreferences,
} from "./appPreferences";
import { APP_PREFERENCES_APP_KEY } from "./constants";

const areAppPreferencesEqual = (left, right) => {
  return JSON.stringify(left) === JSON.stringify(right);
};

export const useAppPreferences = () => {
  const settingsRepository = usePlatformService("settingsRepository");
  const [appPreferences, setAppPreferences] = useState(DEFAULT_APP_PREFERENCES);

  useEffect(() => {
    let cancelled = false;

    settingsRepository
      .getAppSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        const nextPreferences = normalizeAppPreferences(
          settings?.[APP_PREFERENCES_APP_KEY],
        );

        setAppPreferences((prevSettings) =>
          areAppPreferencesEqual(prevSettings, nextPreferences)
            ? prevSettings
            : nextPreferences,
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setAppPreferences((prevSettings) =>
          areAppPreferencesEqual(prevSettings, DEFAULT_APP_PREFERENCES)
            ? prevSettings
            : DEFAULT_APP_PREFERENCES,
        );
      });

    const unsubscribe = settingsRepository.subscribeAppSettingsUpdated((nextSettings) => {
      const nextPreferences = normalizeAppPreferences(
        nextSettings?.[APP_PREFERENCES_APP_KEY],
      );

      setAppPreferences((prevSettings) =>
        areAppPreferencesEqual(prevSettings, nextPreferences)
          ? prevSettings
          : nextPreferences,
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [settingsRepository]);

  const updateAppPreferences = useCallback((patch) => {
    setAppPreferences((currentValue) => {
      const nextPreferences = mergeAppPreferences(currentValue, patch);

      if (areAppPreferencesEqual(currentValue, nextPreferences)) {
        return currentValue;
      }

      void settingsRepository
        .updateAppSettings({
          [APP_PREFERENCES_APP_KEY]: nextPreferences,
        })
        .catch(() => {});

      return nextPreferences;
    });
  }, [settingsRepository]);

  return {
    appPreferences,
    updateAppPreferences,
  };
};
