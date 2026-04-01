import { useEffect, useMemo, useRef } from "react";
import { useAppPreferences } from "@shared/lib/appPreferences";
import {
  debugLogData,
  setDebugEnabled,
  setDebugLevel,
  setDebugMaxEntries,
} from "./logger";

const MAX_TEXT_LENGTH = 80;

const toCleanText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
};

const isInteractiveTarget = (target) => {
  if (!target || typeof target.tagName !== "string") {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  return ["input", "textarea", "select", "option", "button"].includes(tag);
};

const extractTargetDetails = (event) => {
  const target = event?.target;
  if (!target || typeof target !== "object") {
    return {};
  }

  const tag = target.tagName ? target.tagName.toLowerCase() : "unknown";
  const id = target.id || "";
  const name = target.name || "";
  const type = target.type || "";
  const text = toCleanText(target.textContent);
  const ariaLabel = toCleanText(target.getAttribute?.("aria-label") || "");
  const title = toCleanText(target.getAttribute?.("title") || "");
  const data = target.dataset ? { ...target.dataset } : {};

  return {
    tag,
    id,
    name,
    type,
    text,
    ariaLabel,
    title,
    data,
  };
};

export const useActionLogger = () => {
  const { appPreferences } = useAppPreferences();
  const logLevel = appPreferences.privacy?.logLevel || "off";
  const isEnabled = useMemo(() => {
    return logLevel !== "off";
  }, [logLevel]);

  const enabledRef = useRef(isEnabled);
  enabledRef.current = isEnabled;

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    setDebugEnabled(isEnabled);
    setDebugLevel(logLevel === "off" ? "error" : logLevel);
    setDebugMaxEntries(500);
    if (!isEnabled) {
      return undefined;
    }

    const logEvent = (type, payload) => {
      if (!enabledRef.current) {
        return;
      }

      debugLogData(type, {
        path: window.location.pathname,
        ...payload,
      });
    };

    const handleClick = (event) => {
      logEvent("ui.click", extractTargetDetails(event));
    };

    const handleChange = (event) => {
      const target = event?.target;
      const details = extractTargetDetails(event);
      let value = "";

      if (target) {
        if (target.type === "password") {
          value = "<redacted>";
        } else if (target.type === "checkbox") {
          value = target.checked ? "checked" : "unchecked";
        } else {
          value = toCleanText(target.value || "");
        }
      }

      logEvent("ui.change", { ...details, value });
    };

    const handleSubmit = (event) => {
      logEvent("ui.submit", extractTargetDetails(event));
    };

    const handleKeyDown = (event) => {
      if (isInteractiveTarget(event.target)) {
        return;
      }

      logEvent("ui.keydown", {
        code: event.code,
        key: event.key,
        alt: event.altKey,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        shift: event.shiftKey,
      });
    };

    const handleVisibility = () => {
      logEvent("app.visibility", { state: document.visibilityState });
    };

    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      originalPush.apply(this, args);
      logEvent("nav.pushState", { to: String(args[2] || "") });
    };

    window.history.replaceState = function replaceState(...args) {
      originalReplace.apply(this, args);
      logEvent("nav.replaceState", { to: String(args[2] || "") });
    };

    const handlePopState = () => {
      logEvent("nav.popState", {});
    };

    window.addEventListener("click", handleClick, true);
    window.addEventListener("change", handleChange, true);
    window.addEventListener("submit", handleSubmit, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("change", handleChange, true);
      window.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, [isEnabled, logLevel]);
};
