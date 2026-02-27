import { memo } from "react";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import { useDesktopTitleBar } from "../model";
import "./DesktopTitleBar.css";

export const DesktopTitleBar = memo(() => {
  const {
    isDesktopMode,
    platformClassName,
    canGoBack,
    canGoForward,
    navigateBack,
    navigateForward,
  } = useDesktopTitleBar();

  if (!isDesktopMode) {
    return null;
  }

  return (
    <header
      className={`desktop-title-bar ${platformClassName}`.trim()}
      aria-label="Desktop title bar"
    >
      <div className="desktop-title-bar__left">
        <div className="desktop-title-bar__history" role="group" aria-label="History">
          <button
            type="button"
            onClick={navigateBack}
            disabled={!canGoBack}
            aria-label="Go back"
            title="Back"
          >
            <IoChevronBackOutline />
          </button>
          <button
            type="button"
            onClick={navigateForward}
            disabled={!canGoForward}
            aria-label="Go forward"
            title="Forward"
          >
            <IoChevronForwardOutline />
          </button>
        </div>
      </div>

      <div className="desktop-title-bar__center" aria-hidden="true">
        <span className="desktop-title-bar__logo">LL</span>
        <strong>LioraLang</strong>
      </div>

      <div className="desktop-title-bar__right" />
    </header>
  );
});

DesktopTitleBar.displayName = "DesktopTitleBar";

