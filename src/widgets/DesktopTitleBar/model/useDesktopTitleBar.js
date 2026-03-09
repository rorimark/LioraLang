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

    if (
      shortcutSettings.historyNavigation === HISTORY_SHORTCUT_MODES.disabled
    ) {
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
      const usesSystemMode =
        shortcutSettings.historyNavigation === HISTORY_SHORTCUT_MODES.system;
      const usesAlternativeMode =
        shortcutSettings.historyNavigation === HISTORY_SHORTCUT_MODES.alternative;
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
    shortcutSettings.historyNavigation,
  ]);

  return {
    isDesktopMode,
    platformClassName,
    canGoBack: historyState.canGoBack,
    canGoForward: historyState.canGoForward,
    navigateBack,
    navigateForward,
  };
};
