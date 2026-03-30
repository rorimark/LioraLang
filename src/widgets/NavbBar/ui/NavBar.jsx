import "./NavBar.css";
import { memo, useEffect, useState } from "react";
import { Link } from "react-router";
import { NavTab } from "@shared/ui";
import { ROUTE_PATHS } from "@shared/config/routes";
import { NAV_ITEMS } from "@shared/config/routes";
import { usePlatformService } from "@shared/providers";
import { NavBarLearnShortcutsSlot } from "./NavBarLearnShortcutsSlot";
import {
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

export const NavBar = memo(({ mobile = false }) => {
  const authRepository = usePlatformService("authRepository");
  const [accountLabel, setAccountLabel] = useState("Sign in / Sign up");
  const navItems = mobile ? NAV_ITEMS : desktopNavItems;

  useEffect(() => {
    if (!authRepository.isConfigured()) {
      return undefined;
    }

    let isSubscribed = true;

    authRepository
      .getSnapshot()
      .then((snapshot) => {
        if (!isSubscribed) {
          return;
        }

        setAccountLabel(
          snapshot?.isAuthenticated
            ? snapshot.displayName || snapshot.email || "Open account"
            : "Sign in / Sign up",
        );
      })
      .catch(() => {
        if (isSubscribed) {
          setAccountLabel("Sign in / Sign up");
        }
      });

    const unsubscribe = authRepository.subscribe((snapshot) => {
      if (!isSubscribed) {
        return;
      }

      setAccountLabel(
        snapshot?.isAuthenticated
          ? snapshot.displayName || snapshot.email || "Open account"
          : "Sign in / Sign up",
      );
    });

    return () => {
      isSubscribed = false;
      unsubscribe?.();
    };
  }, [authRepository]);

  return (
    <nav
      className={`nav-bar ${mobile ? "nav-bar--mobile" : "nav-bar--desktop"}`}
      aria-label="Primary navigation"
    >
      {!mobile && (
        <div className="nav-bar__brand">
          <span className="nav-bar__logo">LL</span>
          <div>
            <strong>LioraLang</strong>
            <Link
              className="nav-bar__account-link"
              to={ROUTE_PATHS.account}
              aria-label="Open account page"
            >
              {accountLabel}
            </Link>
          </div>
        </div>
      )}

      <ul className="nav-bar__list nav-bar__list--main">
        {navItems.map((item) => (
          <li key={item.key} className="nav-bar__list-item">
            <NavTab
              to={item.to}
              icon={ICONS_BY_NAME[item.icon]}
              title={item.title}
              compact={mobile}
            />
          </li>
        ))}
      </ul>

      {!mobile && settingsNavItem && (
        <>
          <NavBarLearnShortcutsSlot />
          <div className="nav-bar__footer">
            <ul className="nav-bar__list">
              <li className="nav-bar__list-item">
                <NavTab
                  to={settingsNavItem.to}
                  icon={ICONS_BY_NAME[settingsNavItem.icon]}
                  title={settingsNavItem.title}
                />
              </li>
            </ul>
          </div>
        </>
      )}
    </nav>
  );
});

NavBar.displayName = "NavBar";
