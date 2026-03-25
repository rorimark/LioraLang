import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { usePlatformService } from "@app/providers";
import { HISTORY_SHORTCUT_MODES, useShortcutSettings } from "@shared/lib/shortcutSettings";

const DEFAULT_HISTORY_STATE = {
  canGoBack: false,
  canGoForward: false,
};

const resolvePlatformClassName = () => {
  if (typeof navigator === "undefined") {
    return "";
  }

  if (navigator.userAgent.includes("Mac")) {
    return "desktop-title-bar--darwin";
  }

  if (navigator.userAgent.includes("Windows")) {
    return "desktop-title-bar--win32";
  }

  return "desktop-title-bar--linux";
};

const normalizeHistoryState = (value) => {
  if (!value || typeof value !== "object") {
    return DEFAULT_HISTORY_STATE;
  }

  return {
    canGoBack: Boolean(value.canGoBack),
    canGoForward: Boolean(value.canGoForward),
  };
};

const resolveHistoryShortcutLabel = (platformClassName, shortcutMode, direction) => {
  if (shortcutMode === HISTORY_SHORTCUT_MODES.disabled) {
    return "";
  }

  const isDarwin = platformClassName === "desktop-title-bar--darwin";
  const isSystemMode = shortcutMode === HISTORY_SHORTCUT_MODES.system;
  const isAlternativeMode = shortcutMode === HISTORY_SHORTCUT_MODES.alternative;

  if (!isSystemMode && !isAlternativeMode) {
    return "";
  }

  const modifier = isSystemMode
    ? isDarwin
      ? "Cmd"
      : "Alt"
    : isDarwin
      ? "Alt"
      : "Ctrl";
  const arrow = direction === "back" ? "Left" : "Right";

  return `${modifier}+${arrow}`;
};

const isInteractiveEventTarget = (target) => {
  if (!target || typeof target !== "object") {
    return false;
  }

  const elementTagName = target.tagName;
  const tagName =
    typeof elementTagName === "string" ? elementTagName.toLowerCase() : "";

  if (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "option"
  ) {
    return true;
  }

  return Boolean(target.isContentEditable);
};

export const useDesktopTitleBar = () => {
  const { pathname, search, hash } = useLocation();
  const runtimeGateway = usePlatformService("runtimeGateway");
  const isDesktopMode = useMemo(() => runtimeGateway.isDesktopMode(), [runtimeGateway]);
  const [historyState, setHistoryState] = useState(DEFAULT_HISTORY_STATE);
  const platformClassName = useMemo(() => resolvePlatformClassName(), []);
  const { shortcutSettings } = useShortcutSettings();
  const historyShortcutMode = shortcutSettings.historyNavigation;

  useEffect(() => {
    if (!isDesktopMode) {
      return undefined;
    }

    let cancelled = false;

    runtimeGateway
      .getWindowHistoryState()
      .then((state) => {
        if (!cancelled) {
          setHistoryState(normalizeHistoryState(state));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryState(DEFAULT_HISTORY_STATE);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isDesktopMode, pathname, runtimeGateway, search, hash]);

  const navigateBack = useCallback(async () => {
    if (!isDesktopMode) {
      return;
    }

    try {
      const state = await runtimeGateway.navigateWindowBack();
      setHistoryState(normalizeHistoryState(state));
    } catch {
      try {
        const state = await runtimeGateway.getWindowHistoryState();
        setHistoryState(normalizeHistoryState(state));
      } catch {
        setHistoryState(DEFAULT_HISTORY_STATE);
      }
    }
  }, [isDesktopMode, runtimeGateway]);

  const navigateForward = useCallback(async () => {
    if (!isDesktopMode) {
      return;
    }

    try {
      const state = await runtimeGateway.navigateWindowForward();
      setHistoryState(normalizeHistoryState(state));
    } catch {
      try {
        const state = await runtimeGateway.getWindowHistoryState();
        setHistoryState(normalizeHistoryState(state));
      } catch {
        setHistoryState(DEFAULT_HISTORY_STATE);
      }
    }
  }, [isDesktopMode, runtimeGateway]);

  useEffect(() => {
    if (!isDesktopMode || typeof window === "undefined") {
      return undefined;
    }

    if (historyShortcutMode === HISTORY_SHORTCUT_MODES.disabled) {
      return undefined;
    }

    const handleWindowKeyDown = (event) => {
      if (isInteractiveEventTarget(event.target)) {
        return;
      }

      if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") {
        return;
      }

      const isBackAction = event.code === "ArrowLeft";
      const isForwardAction = event.code === "ArrowRight";
      const isDarwin = platformClassName === "desktop-title-bar--darwin";
      const usesSystemMode = historyShortcutMode === HISTORY_SHORTCUT_MODES.system;
      const usesAlternativeMode =
        historyShortcutMode === HISTORY_SHORTCUT_MODES.alternative;
      const usesMetaModifier = isDarwin && usesSystemMode;
      const usesAltModifier =
        (isDarwin && usesAlternativeMode) || (!isDarwin && usesSystemMode);
      const usesCtrlModifier = !isDarwin && usesAlternativeMode;
      const matchesMetaModifier = usesMetaModifier
        ? event.metaKey && !event.altKey && !event.ctrlKey
        : !event.metaKey;
      const matchesAltModifier = usesAltModifier
        ? event.altKey && !event.metaKey && !event.ctrlKey
        : !event.altKey;
      const matchesCtrlModifier = usesCtrlModifier
        ? event.ctrlKey && !event.metaKey && !event.altKey
        : !event.ctrlKey;

      if (!matchesMetaModifier || !matchesAltModifier || !matchesCtrlModifier) {
        return;
      }

      event.preventDefault();

      if (isBackAction) {
        void navigateBack();
      }

      if (isForwardAction) {
        void navigateForward();
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [
    isDesktopMode,
    navigateBack,
    navigateForward,
    platformClassName,
    historyShortcutMode,
  ]);

  const backShortcutLabel = useMemo(
    () =>
      resolveHistoryShortcutLabel(
        platformClassName,
        historyShortcutMode,
        "back",
      ),
    [historyShortcutMode, platformClassName],
  );

  const forwardShortcutLabel = useMemo(
    () =>
      resolveHistoryShortcutLabel(
        platformClassName,
        historyShortcutMode,
        "forward",
      ),
    [historyShortcutMode, platformClassName],
  );

  return {
    isDesktopMode,
    platformClassName,
    canGoBack: historyState.canGoBack,
    canGoForward: historyState.canGoForward,
    navigateBack,
    navigateForward,
    backShortcutLabel,
    forwardShortcutLabel,
  };
};
