import { useCallback, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const isElementFocusable = (element) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.hasAttribute("disabled")) {
    return false;
  }

  if (element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  if (element.tabIndex < 0) {
    return false;
  }

  return true;
};

const getFocusableElements = (containerElement) => {
  if (!(containerElement instanceof HTMLElement)) {
    return [];
  }

  return Array.from(containerElement.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    isElementFocusable,
  );
};

export const useDialogA11y = ({
  isOpen,
  containerRef,
  onClose,
  initialFocusSelector = "[data-autofocus]",
  restoreFocus = true,
}) => {
  const lastFocusedElementRef = useRef(null);

  const handleDocumentKeyDown = useCallback(
    (event) => {
      if (!isOpen) {
        return;
      }

      const containerElement = containerRef.current;

      if (!(containerElement instanceof HTMLElement)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        if (typeof onClose === "function") {
          onClose();
        }

        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(containerElement);

      if (focusableElements.length === 0) {
        event.preventDefault();
        containerElement.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (
          activeElement === firstElement ||
          !containerElement.contains(activeElement)
        ) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement || !containerElement.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [containerRef, isOpen, onClose],
  );

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return undefined;
    }

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const containerElement = containerRef.current;

    if (!(containerElement instanceof HTMLElement)) {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const initialFocusElement =
        containerElement.querySelector(initialFocusSelector) ||
        getFocusableElements(containerElement)[0] ||
        containerElement;

      if (initialFocusElement instanceof HTMLElement) {
        initialFocusElement.focus();
      }
    });

    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      document.removeEventListener("keydown", handleDocumentKeyDown);

      if (!restoreFocus) {
        return;
      }

      const lastFocusedElement = lastFocusedElementRef.current;

      if (
        lastFocusedElement instanceof HTMLElement &&
        document.contains(lastFocusedElement)
      ) {
        lastFocusedElement.focus();
      }
    };
  }, [
    containerRef,
    handleDocumentKeyDown,
    initialFocusSelector,
    isOpen,
    restoreFocus,
  ]);
};
