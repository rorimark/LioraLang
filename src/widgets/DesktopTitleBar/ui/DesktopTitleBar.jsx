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
    backShortcutLabel,
    forwardShortcutLabel,
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
          <div className="desktop-title-bar__history-item">
            <button
              type="button"
              onClick={navigateBack}
              disabled={!canGoBack}
              aria-label="Go back"
            >
              <IoChevronBackOutline />
            </button>
            <div className="desktop-title-bar__tooltip" role="tooltip">
              <span>Go back</span>
              {backShortcutLabel ? (
                <span className="desktop-title-bar__tooltip-shortcut">
                  {backShortcutLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="desktop-title-bar__history-item">
            <button
              type="button"
              onClick={navigateForward}
              disabled={!canGoForward}
              aria-label="Go forward"
            >
              <IoChevronForwardOutline />
            </button>
            <div className="desktop-title-bar__tooltip" role="tooltip">
              <span>Go forward</span>
              {forwardShortcutLabel ? (
                <span className="desktop-title-bar__tooltip-shortcut">
                  {forwardShortcutLabel}
                </span>
              ) : null}
            </div>
          </div>
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
