import { useEffect } from "react";

const POINTER_ACTION_SELECTOR = [
  "button",
  "a[href]",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='tab']",
].join(", ");

const POINTER_TYPES = new Set(["mouse", "pen", "touch"]);

const isElement = (value) => value instanceof Element;

const isHTMLElement = (value) => value instanceof HTMLElement;

const resolvePointerActionTarget = (target) => {
  if (!isElement(target)) {
    return null;
  }

  const matchedElement = target.closest(POINTER_ACTION_SELECTOR);

  if (!isHTMLElement(matchedElement)) {
    return null;
  }

  if (
    matchedElement.matches(":disabled") ||
    matchedElement.getAttribute("aria-disabled") === "true"
  ) {
    return null;
  }

  return matchedElement;
};

export const usePointerFocusGuard = () => {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    let pendingPointerTarget = null;

    const handlePointerDown = (event) => {
      if (!POINTER_TYPES.has(event.pointerType)) {
        pendingPointerTarget = null;
        return;
      }

      pendingPointerTarget = resolvePointerActionTarget(event.target);
    };

    const handleClick = (event) => {
      const clickedTarget = resolvePointerActionTarget(event.target);

      if (!clickedTarget || clickedTarget !== pendingPointerTarget) {
        pendingPointerTarget = null;
        return;
      }

      pendingPointerTarget = null;

      queueMicrotask(() => {
        clickedTarget.blur();
      });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);
};
