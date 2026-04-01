import { memo } from "react";
import "./SectionHeader.css";

export const SectionHeader = memo(({ title, description }) => {
  return (
    <header className="ui-section-header">
      <h3 className="ui-section-header__title">{title}</h3>
      {description ? (
        <p className="ui-section-header__description">{description}</p>
      ) : null}
    </header>
  );
});

SectionHeader.displayName = "SectionHeader";
