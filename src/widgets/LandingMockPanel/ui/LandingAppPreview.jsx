import { memo } from "react";
import { PreviewFlashcard, PreviewNavItem, PreviewRatings } from "./LandingPreviewParts";

// A static miniature of the Learn page on the desktop: sidebar, page header,
// a card mid-review and the grading buttons. Decorative, so hidden from
// assistive tech; the copy beside it carries the meaning.
export const LandingAppPreview = memo(({ navItems, card, ratings }) => {
  const mainItems = navItems.filter((item) => item.key !== "settings");

  return (
    <div className="landing-app-preview" aria-hidden="true">
      <div className="landing-app-preview__chrome">
        <span />
        <span />
        <span />
      </div>
      <div className="landing-app-preview__body">
        <aside className="landing-app-preview__sidebar">
          <div className="landing-app-preview__brand">
            <span className="landing-logo landing-logo--sm">LL</span>
            <strong>LioraLang</strong>
          </div>
          <div className="landing-preview-nav">
            {mainItems.map((item) => (
              <PreviewNavItem key={item.key} item={item} isActive={item.key === "learn"} />
            ))}
          </div>
        </aside>
        <div className="landing-app-preview__main">
          <div className="landing-app-preview__header">
            <strong>Flashcards</strong>
            <span className="landing-app-preview__date">Today · 18 due</span>
          </div>
          <div className="landing-app-preview__stage">
            <PreviewFlashcard card={card} />
            <PreviewRatings ratings={ratings} />
          </div>
        </div>
      </div>
    </div>
  );
});

LandingAppPreview.displayName = "LandingAppPreview";
