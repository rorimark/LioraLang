import { BRAND_NAME } from "@shared/config/brand";
import { memo, useMemo } from "react";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import { AppIcon } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import { useDesktopTitleBar } from "../model";
import "./DesktopTitleBar.css";

export const DesktopTitleBar = memo(() => {
  const { t } = useI18n();
  const panel = useDesktopTitleBar();
  const historyControls = useMemo(
    () => ({
      canGoBack: panel.canGoBack,
      canGoForward: panel.canGoForward,
      navigateBack: panel.navigateBack,
      navigateForward: panel.navigateForward,
      backShortcutLabel: panel.backShortcutLabel,
      forwardShortcutLabel: panel.forwardShortcutLabel,
    }),
    [
      panel.backShortcutLabel,
      panel.canGoBack,
      panel.canGoForward,
      panel.forwardShortcutLabel,
      panel.navigateBack,
      panel.navigateForward,
    ],
  );

  if (!panel.isDesktopMode) {
    return null;
  }

  return (
    <header
      className={`desktop-title-bar ${panel.platformClassName}`.trim()}
      aria-label={t("titleBar.label")}
    >
      <div className="desktop-title-bar__left">
        <div className="desktop-title-bar__history" role="group" aria-label={t("titleBar.history")}>
          <div className="desktop-title-bar__history-item">
            <button
              type="button"
              onClick={historyControls.navigateBack}
              disabled={!historyControls.canGoBack}
              aria-label={t("titleBar.back")}
            >
              <IoChevronBackOutline />
            </button>
            <div className="desktop-title-bar__tooltip" role="tooltip">
              <span>{t("titleBar.back")}</span>
              {historyControls.backShortcutLabel ? (
                <span className="desktop-title-bar__tooltip-shortcut">
                  {historyControls.backShortcutLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="desktop-title-bar__history-item">
            <button
              type="button"
              onClick={historyControls.navigateForward}
              disabled={!historyControls.canGoForward}
              aria-label={t("titleBar.forward")}
            >
              <IoChevronForwardOutline />
            </button>
            <div className="desktop-title-bar__tooltip" role="tooltip">
              <span>{t("titleBar.forward")}</span>
              {historyControls.forwardShortcutLabel ? (
                <span className="desktop-title-bar__tooltip-shortcut">
                  {historyControls.forwardShortcutLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="desktop-title-bar__center" aria-hidden="true">
        <AppIcon size={22} className="desktop-title-bar__logo" />
        <strong>{BRAND_NAME}</strong>
      </div>

      <div className="desktop-title-bar__right" />
    </header>
  );
});

DesktopTitleBar.displayName = "DesktopTitleBar";
