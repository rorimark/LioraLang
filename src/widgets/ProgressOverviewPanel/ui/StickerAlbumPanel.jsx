import { memo, useCallback, useState } from "react";
import { Link } from "react-router";
import { IoArrowBack } from "react-icons/io5";
import { ROUTE_PATHS } from "@shared/config/routes";
import { formatInteger, plural, useProgressOverviewPanel } from "../model";
import { Sticker, StickerDialog } from "./Sticker";
import "./ProgressOverviewPanel.css";
import "./StickerAlbumPanel.css";

// One line per family: where you stand now, in its own words.
const FAMILY_SUMMARY = {
  known: (family) => `${plural(family.current, "word")} known now`,
  streak: (family, overview) =>
    `Best ${plural(family.current, "day")} in a row, ${formatInteger(overview.streak.current)} now`,
  mature: (family) => `${plural(family.current, "word")} in long-term memory`,
  days: (family) => `${plural(family.current, "day")} with reviews`,
  reviews: (family) => `${plural(family.current, "review")} in all`,
  bigDay: (family) => `Most in one day: ${plural(family.current, "review")}`,
  cleanSheet: (family) => `${plural(family.current, "day")} with 20+ reviews and no Again`,
  decks: (family) => `${plural(family.current, "deck")} fully known`,
};

export const StickerAlbumPanel = memo(() => {
  const { overview, stickers, isLoading, error, refreshOverview } = useProgressOverviewPanel();
  const [selection, setSelection] = useState(null);
  const openSticker = useCallback((tier, family) => setSelection({ tier, family }), []);
  const closeSticker = useCallback(() => setSelection(null), []);

  if (isLoading && !stickers) {
    return <div className="album album--loading" aria-busy="true" aria-label="Loading stickers" />;
  }

  if (error) {
    return (
      <section className="progress-card progress-error" role="alert">
        <h2>Stickers could not be loaded</h2>
        <p>{error}</p>
        <button type="button" className="ui-button ui-button--secondary" onClick={refreshOverview}>
          Try again
        </button>
      </section>
    );
  }

  const share = stickers.totalCount > 0 ? (stickers.earnedCount / stickers.totalCount) * 100 : 0;

  return (
    <div className="album">
      <Link className="album__back" to={ROUTE_PATHS.progress}>
        <IoArrowBack aria-hidden />
        Progress
      </Link>

      <header className="album__head">
        <p className="album__count">
          <strong>{formatInteger(stickers.earnedCount)}</strong>
          <span>of {formatInteger(stickers.totalCount)} stickers</span>
        </p>
        <div
          className="album__meter"
          role="meter"
          aria-label="Stickers earned"
          aria-valuemin={0}
          aria-valuemax={stickers.totalCount}
          aria-valuenow={stickers.earnedCount}
        >
          <span style={{ width: `${share}%` }} />
        </div>
        <p className="album__lede">
          {stickers.newCount > 0
            ? `${plural(stickers.newCount, "new sticker")} since your last visit.`
            : "Tap a sticker to see what it takes, or when you earned it."}
        </p>
      </header>

      <div className="album__families">
        {stickers.families.map((family) => {
          const earned = family.tiers.filter((tier) => tier.earned).length;

          return (
            <section key={family.key} className="album-family" aria-labelledby={`album-${family.key}`}>
              <header className="album-family__head">
                <h2 id={`album-${family.key}`}>{family.title}</h2>
                <span className="album-family__count">
                  {earned} / {family.tiers.length}
                </span>
                <p>{FAMILY_SUMMARY[family.key]?.(family, overview)}</p>
              </header>
              <div className="album-family__sheet">
                {family.tiers.map((tier, index) => (
                  <Sticker key={tier.id} tier={tier} family={family} index={index} onOpen={openSticker} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <StickerDialog selection={selection} onClose={closeSticker} />
    </div>
  );
});

StickerAlbumPanel.displayName = "StickerAlbumPanel";
