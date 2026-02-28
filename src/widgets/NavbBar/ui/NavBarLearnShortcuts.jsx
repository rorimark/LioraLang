import { memo } from "react";
import { useNavBarLearnShortcuts } from "../model";

export const NavBarLearnShortcuts = memo(() => {
  const { learnShortcutLegend } = useNavBarLearnShortcuts();

  return (
    <section className="nav-bar__shortcuts" aria-label="Learn shortcuts">
      <p className="nav-bar__shortcuts-title">Learn shortcuts</p>
      <ul className="nav-bar__shortcuts-list">
        {learnShortcutLegend.map((shortcutItem) => (
          <li key={shortcutItem.key} className="nav-bar__shortcuts-item">
            <span>{shortcutItem.label}</span>
            <kbd>{shortcutItem.shortcut}</kbd>
          </li>
        ))}
      </ul>
    </section>
  );
});

NavBarLearnShortcuts.displayName = "NavBarLearnShortcuts";
