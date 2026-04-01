import { memo, useCallback } from "react";
import "./Tabs.css";

const resolveTabClassName = (tabKey, activeKey, highlightedKey) => {
  if (highlightedKey === tabKey) {
    return "ui-tabs__tab ui-tabs__tab--highlighted";
  }

  if (activeKey === tabKey) {
    return "ui-tabs__tab ui-tabs__tab--active";
  }

  return "ui-tabs__tab";
};

export const Tabs = memo(
  ({ items = [], activeKey = "", highlightedKey = "", onSelect, ariaLabel }) => {
    const handleClick = useCallback(
      (event) => {
        const nextKey = event.currentTarget.dataset.tabKey;

        if (!nextKey || typeof onSelect !== "function") {
          return;
        }

        onSelect(nextKey);
      },
      [onSelect],
    );

    return (
      <div className="ui-tabs" role="tablist" aria-label={ariaLabel}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={activeKey === item.key}
            className={resolveTabClassName(item.key, activeKey, highlightedKey)}
            data-tab-key={item.key}
            onClick={handleClick}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  },
);

Tabs.displayName = "Tabs";
