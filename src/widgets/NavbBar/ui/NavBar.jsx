import "./NavBar.css";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { AppIcon, NavTab } from "@shared/ui";
import { NAV_ITEMS, ROUTE_PATHS } from "@shared/config/routes";
import { useI18n } from "@shared/lib/i18n";
import { usePlatformService } from "@shared/providers";
import {
  IoBook,
  IoGlobe,
  IoLayers,
  IoPersonCircle,
  IoSettings,
  IoStatsChart,
  IoPersonCircleOutline,
  IoLayersOutline,
  IoGlobeOutline,
  IoBookOutline,
  IoStatsChartOutline,
  IoSettingsOutline,
} from "react-icons/io5";

const desktopNavItems = NAV_ITEMS.filter((item) => item.key !== "settings");
const settingsNavItem = NAV_ITEMS.find((item) => item.key === "settings");

const ICONS_BY_NAME = {
  learn: IoLayersOutline,
  browse: IoGlobeOutline,
  decks: IoBookOutline,
  progress: IoStatsChartOutline,
  settings: IoSettingsOutline,
};

const ACTIVE_ICONS_BY_NAME = {
  learn: IoLayers,
  browse: IoGlobe,
  decks: IoBook,
  progress: IoStatsChart,
  settings: IoSettings,
};

// Who is signed in; the words for it are picked at render, in the
// interface's language.
const SIGNED_OUT_ACCOUNT = Object.freeze({ isAuthenticated: false, name: "", label: "" });

const resolveAccount = (snapshot) =>
  snapshot?.isAuthenticated
    ? {
        isAuthenticated: true,
        name: snapshot.displayName || snapshot.email || "",
        label: `in:${snapshot.displayName || snapshot.email || ""}`,
      }
    : SIGNED_OUT_ACCOUNT;

// A tab already open does nothing when pressed again, except Settings: a
// section inside it lives in the query, so pressing Settings there goes
// back to the list of sections.
const isAlreadyOpen = (location, targetPath) =>
  location.pathname === targetPath &&
  (targetPath !== ROUTE_PATHS.settings || !location.search);

const NavItemsList = memo(
  ({
    items,
    compact = false,
    location,
    onActivePointerDown,
    onPreviewCancel,
    onPreviewLeave,
    onPreviewContextMenu,
  }) => {
    const { t } = useI18n();
    const handleNavTabClick = useCallback(
      (event, targetPath) => {
        if (isAlreadyOpen(location, targetPath)) {
          event.preventDefault();
        }
      },
      [location],
    );

    return (
      <ul className="nav-bar__list nav-bar__list--main">
        {items.map((item) => (
          <li key={item.key} className="nav-bar__list-item">
            <NavTab
              to={item.to}
              icon={ICONS_BY_NAME[item.icon]}
              activeIcon={ACTIVE_ICONS_BY_NAME[item.icon]}
              title={t(item.titleKey)}
              compact={compact}
              draggable={compact ? false : undefined}
              onClick={(event) => {
                handleNavTabClick(event, item.to);
              }}
              onPointerDown={compact ? onActivePointerDown : undefined}
              onPointerCancel={compact ? onPreviewCancel : undefined}
              onPointerLeave={compact ? onPreviewLeave : undefined}
              onDragStart={compact ? onPreviewContextMenu : undefined}
              onContextMenu={compact ? onPreviewContextMenu : undefined}
            />
          </li>
        ))}
      </ul>
    );
  },
);

NavItemsList.displayName = "NavItemsList";

const AccountRailLink = memo(({ pathname }) => {
  const { t } = useI18n();
  const authRepository = usePlatformService("authRepository");
  const [account, setAccount] = useState(SIGNED_OUT_ACCOUNT);

  useEffect(() => {
    if (!authRepository.isConfigured()) {
      return undefined;
    }

    let isSubscribed = true;
    const updateAccount = (nextSnapshot) => {
      if (!isSubscribed) {
        return;
      }

      const nextAccount = resolveAccount(nextSnapshot);
      setAccount((previousAccount) =>
        previousAccount.label === nextAccount.label ? previousAccount : nextAccount,
      );
    };

    authRepository
      .getSnapshot()
      .then(updateAccount)
      .catch(() => {
        updateAccount(null);
      });

    const unsubscribe = authRepository.subscribe(updateAccount);

    return () => {
      isSubscribed = false;
      unsubscribe?.();
    };
  }, [authRepository]);

  return (
    <NavTab
      to={ROUTE_PATHS.account}
      icon={IoPersonCircleOutline}
      activeIcon={IoPersonCircle}
      title={account.isAuthenticated ? t("nav.account") : t("nav.signIn")}
      aria-label={
        account.isAuthenticated
          ? account.name
            ? t("nav.accountOf", { name: account.name })
            : t("nav.account")
          : t("nav.signInOrUp")
      }
      compact
      onClick={(event) => {
        if (pathname === ROUTE_PATHS.account) {
          event.preventDefault();
        }
      }}
    />
  );
});

AccountRailLink.displayName = "AccountRailLink";

// On wide screens the navigation is a narrow rail: the page gets the width,
// and every section is one icon with its name under it.
const DesktopNavBar = memo(() => {
  const { t } = useI18n();
  const location = useLocation();
  const { pathname } = location;

  return (
    <nav className="nav-bar nav-bar--rail" aria-label={t("nav.primary")}>
      <Link className="nav-bar__brand" to={ROUTE_PATHS.learn} aria-label={t("nav.brandToLearn")}>
        <AppIcon size={40} className="nav-bar__logo" />
      </Link>

      <NavItemsList items={desktopNavItems} compact location={location} />

      <ul className="nav-bar__list nav-bar__footer">
        <li className="nav-bar__list-item">
          <AccountRailLink pathname={pathname} />
        </li>
        {settingsNavItem ? (
          <li className="nav-bar__list-item">
            <NavTab
              to={settingsNavItem.to}
              icon={ICONS_BY_NAME[settingsNavItem.icon]}
              activeIcon={ACTIVE_ICONS_BY_NAME[settingsNavItem.icon]}
              title={t(settingsNavItem.titleKey)}
              compact
              onClick={(event) => {
                if (isAlreadyOpen(location, settingsNavItem.to)) {
                  event.preventDefault();
                }
              }}
            />
          </li>
        ) : null}
      </ul>
    </nav>
  );
});

DesktopNavBar.displayName = "DesktopNavBar";

const MobileNavBar = memo(() => {
  const { t } = useI18n();
  const mobileListRef = useRef(null);
  const mobileIndicatorRef = useRef(null);
  const mobileIndicatorSnapshotRef = useRef(null);
  const mobilePreviewTabRef = useRef(null);
  const mobileIndicatorFrameRef = useRef(0);
  const location = useLocation();
  const { pathname } = location;

  const measureMobileIndicator = useCallback(() => {
    const listElement = mobileListRef.current;
    const indicatorElement = mobileIndicatorRef.current;

    if (!listElement || !indicatorElement) {
      return;
    }

    const activeTabElement = listElement.querySelector(".nav-tab.is-active");
    const targetTabElement =
      mobilePreviewTabRef.current &&
      listElement.contains(mobilePreviewTabRef.current)
        ? mobilePreviewTabRef.current
        : activeTabElement;

    if (!targetTabElement) {
      indicatorElement.classList.remove("is-ready");
      mobileIndicatorSnapshotRef.current = null;
      return;
    }

    const listRect = listElement.getBoundingClientRect();
    const tabRect = targetTabElement.getBoundingClientRect();
    const nextSnapshot = {
      x: tabRect.left - listRect.left,
      y: tabRect.top - listRect.top,
      width: tabRect.width,
      height: tabRect.height,
    };
    const previousSnapshot = mobileIndicatorSnapshotRef.current;

    if (
      previousSnapshot &&
      Math.abs(previousSnapshot.x - nextSnapshot.x) < 0.5 &&
      Math.abs(previousSnapshot.y - nextSnapshot.y) < 0.5 &&
      Math.abs(previousSnapshot.width - nextSnapshot.width) < 0.5 &&
      Math.abs(previousSnapshot.height - nextSnapshot.height) < 0.5 &&
      indicatorElement.classList.contains("is-ready")
    ) {
      return;
    }

    indicatorElement.style.setProperty("--nav-mobile-indicator-x", `${nextSnapshot.x}px`);
    indicatorElement.style.setProperty("--nav-mobile-indicator-y", `${nextSnapshot.y}px`);
    indicatorElement.style.setProperty(
      "--nav-mobile-indicator-width",
      `${nextSnapshot.width}px`,
    );
    indicatorElement.style.setProperty(
      "--nav-mobile-indicator-height",
      `${nextSnapshot.height}px`,
    );
    indicatorElement.classList.add("is-ready");
    mobileIndicatorSnapshotRef.current = nextSnapshot;
  }, []);

  const scheduleMobileIndicatorMeasure = useCallback(() => {
    cancelAnimationFrame(mobileIndicatorFrameRef.current);
    mobileIndicatorFrameRef.current = requestAnimationFrame(measureMobileIndicator);
  }, [measureMobileIndicator]);

  useLayoutEffect(() => {
    mobilePreviewTabRef.current = null;
    scheduleMobileIndicatorMeasure();

    return () => {
      cancelAnimationFrame(mobileIndicatorFrameRef.current);
    };
  }, [pathname, scheduleMobileIndicatorMeasure]);

  useEffect(() => {
    if (!mobileListRef.current || typeof ResizeObserver !== "function") {
      return undefined;
    }

    const listElement = mobileListRef.current;
    const resizeObserver = new ResizeObserver(() => {
      scheduleMobileIndicatorMeasure();
    });

    resizeObserver.observe(listElement);
    window.addEventListener("orientationchange", scheduleMobileIndicatorMeasure, {
      passive: true,
    });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", scheduleMobileIndicatorMeasure);
    };
  }, [scheduleMobileIndicatorMeasure]);

  const handleMobileTabPointerDown = useCallback(
    (event) => {
      if (event.pointerType === "mouse") {
        return;
      }

      if (event.currentTarget.classList.contains("is-active")) {
        return;
      }

      mobilePreviewTabRef.current = event.currentTarget;
      scheduleMobileIndicatorMeasure();
    },
    [scheduleMobileIndicatorMeasure],
  );

  const clearMobileTabPreview = useCallback(
    (event) => {
      if (event && mobilePreviewTabRef.current !== event.currentTarget) {
        return;
      }

      mobilePreviewTabRef.current = null;
      scheduleMobileIndicatorMeasure();
    },
    [scheduleMobileIndicatorMeasure],
  );

  const handleMobileTabPointerLeave = useCallback(
    (event) => {
      if (event.pointerType && event.pointerType !== "mouse") {
        return;
      }

      clearMobileTabPreview(event);
    },
    [clearMobileTabPreview],
  );

  const handleMobileTabContextMenu = useCallback((event) => {
    event.preventDefault();
  }, []);

  return (
    <nav className="nav-bar nav-bar--mobile" aria-label={t("nav.primary")}>
      <div className="nav-bar__mobile-track">
        <span
          ref={mobileIndicatorRef}
          className="nav-bar__mobile-indicator"
          aria-hidden="true"
        />
        <div ref={mobileListRef} className="nav-bar__mobile-list-wrap">
          <NavItemsList
            items={NAV_ITEMS}
            compact
            location={location}
            onActivePointerDown={handleMobileTabPointerDown}
            onPreviewCancel={clearMobileTabPreview}
            onPreviewLeave={handleMobileTabPointerLeave}
            onPreviewContextMenu={handleMobileTabContextMenu}
          />
        </div>
      </div>
    </nav>
  );
});

MobileNavBar.displayName = "MobileNavBar";

export const NavBar = memo(({ mobile = false }) => {
  return mobile ? <MobileNavBar /> : <DesktopNavBar />;
});

NavBar.displayName = "NavBar";
