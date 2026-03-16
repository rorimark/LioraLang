import { useEffect } from "react";

export const useDeckTagsPopover = (containerRef) => {
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) {
      return undefined;
    }

    const alignTooltip = (wrap) => {
      if (!wrap) {
        return;
      }

      const tooltip = wrap.querySelector(".decks-table__tags-tooltip");
      if (!tooltip) {
        return;
      }

      wrap.classList.remove("decks-table__tags-more-wrap--align-left");

      const wrapRect = wrap.getBoundingClientRect();
      const tooltipWidth = tooltip.getBoundingClientRect().width;
      const spaceLeft = wrapRect.left;
      const spaceRight = window.innerWidth - wrapRect.right;

      if (spaceLeft < tooltipWidth && spaceRight > spaceLeft) {
        wrap.classList.add("decks-table__tags-more-wrap--align-left");
      }
    };

    const closeOpenPopovers = (activeWrap) => {
      const popovers = container.querySelectorAll(".decks-table__tags-more-wrap");

      popovers.forEach((popover) => {
        if (activeWrap && popover === activeWrap) {
          return;
        }

        popover.classList.remove("decks-table__tags-more-wrap--open");
      });
    };

    const handlePointerDown = (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const activeWrap = event.target.closest(".decks-table__tags-more-wrap");
      closeOpenPopovers(activeWrap);

      if (activeWrap) {
        activeWrap.classList.toggle("decks-table__tags-more-wrap--open");
        alignTooltip(activeWrap);
      }
    };

    const handlePointerEnter = (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const activeWrap = event.target.closest(".decks-table__tags-more-wrap");
      alignTooltip(activeWrap);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      closeOpenPopovers(null);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    container.addEventListener("pointerenter", handlePointerEnter, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      container.removeEventListener("pointerenter", handlePointerEnter, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef]);
};
