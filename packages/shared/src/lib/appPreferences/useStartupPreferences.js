import { useEffect, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { APP_PREFERENCES_APP_KEY } from "./constants";
import {
  DEFAULT_STARTUP_PREFERENCES,
  normalizeStartupPreferences,
} from "./startupPreferences";

const areStartupPreferencesEqual = (left, right) => {
  return JSON.stringify(left) === JSON.stringify(right);
};

export const useStartupPreferences = () => {
  const settingsRepository = usePlatformService("settingsRepository");
  const [startupPreferences, setStartupPreferences] = useState(
    DEFAULT_STARTUP_PREFERENCES,
  );
  // Until the stored settings have been read, the defaults are a guess;
  // what depends on a real choice (the language) waits for this.
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    settingsRepository
      .getAppSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        const nextStartupPreferences = normalizeStartupPreferences(
          settings?.[APP_PREFERENCES_APP_KEY],
        );

        setStartupPreferences((prevValue) =>
          areStartupPreferencesEqual(prevValue, nextStartupPreferences)
            ? prevValue
            : nextStartupPreferences,
        );
        setIsLoaded(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setStartupPreferences((prevValue) =>
          areStartupPreferencesEqual(prevValue, DEFAULT_STARTUP_PREFERENCES)
            ? prevValue
            : DEFAULT_STARTUP_PREFERENCES,
        );
        setIsLoaded(true);
      });

    const unsubscribe = settingsRepository.subscribeAppSettingsUpdated((nextSettings) => {
      const nextStartupPreferences = normalizeStartupPreferences(
        nextSettings?.[APP_PREFERENCES_APP_KEY],
      );

      setStartupPreferences((prevValue) =>
        areStartupPreferencesEqual(prevValue, nextStartupPreferences)
          ? prevValue
          : nextStartupPreferences,
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [settingsRepository]);

  return {
    startupPreferences,
    isLoaded,
  };
};
