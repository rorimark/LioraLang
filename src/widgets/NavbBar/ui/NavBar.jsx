import "./NavBar.css";
import { memo } from "react";
import { NavTab } from "@shared/ui";
import {
  IoLayersOutline,
  IoGlobeOutline,
  IoBookOutline,
  IoStatsChartOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import { useNavBar } from "../model";
import { NavBarLearnShortcuts } from "./NavBarLearnShortcuts";

const ICONS_BY_NAME = {
  learn: IoLayersOutline,
  browse: IoGlobeOutline,
  decks: IoBookOutline,
  progress: IoStatsChartOutline,
  settings: IoSettingsOutline,
};

export const NavBar = memo(({ mobile = false }) => {
  const { navItems, settingsNavItem, showLearnShortcuts } = useNavBar(mobile);

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
            <p>Mark Storchovyi</p>
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

      {showLearnShortcuts && <NavBarLearnShortcuts />}

      {!mobile && settingsNavItem && (
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
      )}
    </nav>
  );
});

NavBar.displayName = "NavBar";
