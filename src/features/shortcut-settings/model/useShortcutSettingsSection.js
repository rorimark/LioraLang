import { useCallback, useMemo } from "react";
import {
  HISTORY_SHORTCUT_MODES,
  LEARN_FLIP_SHORTCUT_MODES,
  LEARN_RATING_SHORTCUT_MODES,
  useShortcutSettings,
} from "@shared/lib/shortcutSettings";
import { useI18n } from "@shared/lib/i18n";

const resolvePlatform = () => {
  if (typeof navigator === "undefined") {
    return "linux";
  }

  if (navigator.userAgent.includes("Mac")) {
    return "darwin";
  }

  if (navigator.userAgent.includes("Windows")) {
    return "win32";
  }

  return "linux";
};

export const useShortcutSettingsSection = () => {
  const platform = useMemo(() => resolvePlatform(), []);
  const { shortcutSettings, updateShortcutSettings } = useShortcutSettings();
  const { t } = useI18n();
  // The first choice of each is the default, and says so.
  const asDefault = useCallback((label) => t("shortcuts.default", { label }), [t]);

  const historyOptions = useMemo(() => {
    const isDarwin = platform === "darwin";

    return [
      {
        value: HISTORY_SHORTCUT_MODES.system,
        label: asDefault(isDarwin ? t("shortcuts.cmdArrows") : t("shortcuts.altArrows")),
      },
      {
        value: HISTORY_SHORTCUT_MODES.alternative,
        label: isDarwin ? t("shortcuts.optionArrows") : t("shortcuts.ctrlArrows"),
      },
      {
        value: HISTORY_SHORTCUT_MODES.disabled,
        label: t("shortcuts.off"),
      },
    ];
  }, [asDefault, platform, t]);

  const flipOptions = useMemo(
    () => [
      {
        value: LEARN_FLIP_SHORTCUT_MODES.space,
        label: asDefault(t("shortcuts.space")),
        shortLabel: t("shortcuts.space"),
      },
      {
        value: LEARN_FLIP_SHORTCUT_MODES.enter,
        label: "Enter",
      },
      {
        value: LEARN_FLIP_SHORTCUT_MODES.disabled,
        label: t("shortcuts.off"),
      },
    ],
    [asDefault, t],
  );

  const ratingOptions = useMemo(
    () => [
      {
        value: LEARN_RATING_SHORTCUT_MODES.digits,
        label: asDefault("1 / 2 / 3 / 4"),
      },
      {
        value: LEARN_RATING_SHORTCUT_MODES.asdf,
        label: "A / S / D / F",
      },
      {
        value: LEARN_RATING_SHORTCUT_MODES.arrows,
        label: "← / ↓ / ↑ / →",
      },
      {
        value: LEARN_RATING_SHORTCUT_MODES.disabled,
        label: t("shortcuts.off"),
      },
    ],
    [asDefault, t],
  );

  const handleHistoryShortcutChange = useCallback(
    (event) => {
      updateShortcutSettings({
        historyNavigation: event.target.value,
      });
    },
    [updateShortcutSettings],
  );

  const handleFlipShortcutChange = useCallback(
    (event) => {
      updateShortcutSettings({
        learnFlip: event.target.value,
      });
    },
    [updateShortcutSettings],
  );

  const handleRatingShortcutChange = useCallback(
    (event) => {
      updateShortcutSettings({
        learnRating: event.target.value,
      });
    },
    [updateShortcutSettings],
  );

  const handleShowLearnShortcutsChange = useCallback(
    (event) => {
      updateShortcutSettings({
        showLearnShortcuts: Boolean(event.target.checked),
      });
    },
    [updateShortcutSettings],
  );

  return {
    historyShortcutMode: shortcutSettings.historyNavigation,
    learnFlipShortcutMode: shortcutSettings.learnFlip,
    learnRatingShortcutMode: shortcutSettings.learnRating,
    showLearnShortcuts: shortcutSettings.showLearnShortcuts,
    historyOptions,
    flipOptions,
    ratingOptions,
    handleHistoryShortcutChange,
    handleFlipShortcutChange,
    handleRatingShortcutChange,
    handleShowLearnShortcutsChange,
  };
};
