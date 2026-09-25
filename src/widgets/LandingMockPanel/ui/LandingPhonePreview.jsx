import { memo } from "react";
import { PreviewFlashcard, PreviewNavItem, PreviewRatings } from "./LandingPreviewParts";

// The same Learn page as the phone renders it: title bar, card, grading
// buttons two by two, and the bottom tab bar.
export const LandingPhonePreview = memo(({ navItems, card, ratings }) => (
  <div className="landing-phone-preview" aria-hidden="true">
    <div className="landing-phone-preview__screen">
      <div className="landing-phone-preview__title">Flashcards</div>
      <div className="landing-phone-preview__stage">
        <PreviewFlashcard card={card} />
        <PreviewRatings ratings={ratings} />
      </div>
      <div className="landing-phone-preview__tabs">
        {navItems.map((item) => (
          <PreviewNavItem
            key={item.key}
            item={item}
            isActive={item.key === "learn"}
            isCompact
          />
        ))}
      </div>
    </div>
  </div>
));

LandingPhonePreview.displayName = "LandingPhonePreview";
