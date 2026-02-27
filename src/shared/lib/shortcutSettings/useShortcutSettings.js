import { useCallback, useEffect, useState } from "react";
import { desktopApi } from "@shared/api";
import {
  DEFAULT_SHORTCUT_SETTINGS,
  SHORTCUT_SETTINGS_APP_KEY,
  normalizeShortcutSettings,
} from "./shortcutSettings";

export const useShortcutSettings = () => {
  const [shortcutSettings, setShortcutSettings] = useState(
    DEFAULT_SHORTCUT_SETTINGS,
  );

  useEffect(() => {
    let cancelled = false;

    desktopApi
      .getAppSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        const storedShortcutSettings = settings?.[SHORTCUT_SETTINGS_APP_KEY];
        setShortcutSettings(normalizeShortcutSettings(storedShortcutSettings));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setShortcutSettings(DEFAULT_SHORTCUT_SETTINGS);
      });

    const unsubscribe = desktopApi.subscribeAppSettingsUpdated((nextSettings) => {
      const storedShortcutSettings = nextSettings?.[SHORTCUT_SETTINGS_APP_KEY];
      setShortcutSettings(normalizeShortcutSettings(storedShortcutSettings));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const updateShortcutSettings = useCallback((patch) => {
    setShortcutSettings((prevSettings) => {
      const nextSettings = normalizeShortcutSettings({
        ...prevSettings,
        ...(patch || {}),
      });

      void desktopApi
        .updateAppSettings({
          [SHORTCUT_SETTINGS_APP_KEY]: nextSettings,
        })
        .catch(() => {});
      return nextSettings;
    });
  }, []);

  return {
    shortcutSettings,
    updateShortcutSettings,
  };
};
