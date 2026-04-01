import { useCallback, useEffect, useState } from "react";
import { usePlatformService } from "@shared/providers";
import {
  DEFAULT_SHORTCUT_SETTINGS,
  SHORTCUT_SETTINGS_APP_KEY,
  normalizeShortcutSettings,
} from "./shortcutSettings";

const areShortcutSettingsEqual = (left, right) => {
  return JSON.stringify(left) === JSON.stringify(right);
};

export const useShortcutSettings = () => {
  const settingsRepository = usePlatformService("settingsRepository");
  const [shortcutSettings, setShortcutSettings] = useState(
    DEFAULT_SHORTCUT_SETTINGS,
  );

  useEffect(() => {
    let cancelled = false;

    settingsRepository
      .getAppSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        const storedShortcutSettings = settings?.[SHORTCUT_SETTINGS_APP_KEY];
        const nextShortcutSettings = normalizeShortcutSettings(
          storedShortcutSettings,
        );

        setShortcutSettings((prevValue) =>
          areShortcutSettingsEqual(prevValue, nextShortcutSettings)
            ? prevValue
            : nextShortcutSettings,
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setShortcutSettings((prevValue) =>
          areShortcutSettingsEqual(prevValue, DEFAULT_SHORTCUT_SETTINGS)
            ? prevValue
            : DEFAULT_SHORTCUT_SETTINGS,
        );
      });

    const unsubscribe = settingsRepository.subscribeAppSettingsUpdated((nextSettings) => {
      const storedShortcutSettings = nextSettings?.[SHORTCUT_SETTINGS_APP_KEY];
      const nextShortcutSettings = normalizeShortcutSettings(
        storedShortcutSettings,
      );

      setShortcutSettings((prevValue) =>
        areShortcutSettingsEqual(prevValue, nextShortcutSettings)
          ? prevValue
          : nextShortcutSettings,
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [settingsRepository]);

  const updateShortcutSettings = useCallback((patch) => {
    setShortcutSettings((prevSettings) => {
      const nextSettings = normalizeShortcutSettings({
        ...prevSettings,
        ...(patch || {}),
      });

      if (areShortcutSettingsEqual(prevSettings, nextSettings)) {
        return prevSettings;
      }

      void settingsRepository
        .updateAppSettings({
          [SHORTCUT_SETTINGS_APP_KEY]: nextSettings,
        })
        .catch(() => {});
      return nextSettings;
    });
  }, [settingsRepository]);

  return {
    shortcutSettings,
    updateShortcutSettings,
  };
};
