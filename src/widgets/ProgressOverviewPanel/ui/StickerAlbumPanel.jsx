import { memo, useCallback, useState } from "react";
import { Link } from "react-router";
import { IoArrowBack } from "react-icons/io5";
import { ROUTE_PATHS } from "@shared/config/routes";
import { stickerTitle, useProgressOverviewPanel } from "../model";
import { Sticker, StickerDialog } from "./Sticker";
import "./ProgressOverviewPanel.css";
import "./StickerAlbumPanel.css";
import { useI18n, withEmphasis } from "@shared/lib/i18n";

// One line per family: where you stand now, in its own words
// (stickers.<family>.now).
const describeFamilyNow = ({ t }, family, overview) =>
  t(`stickers.${family.key}.now`, { count: family.current, streak: overview?.streak?.current ?? 0 });

export const StickerAlbumPanel = memo(() => {
  const { overview, stickers, isLoading, error, refreshOverview } = useProgressOverviewPanel();
  const i18n = useI18n();
  const { t, formatNumber } = i18n;
  const [selection, setSelection] = useState(null);
  const openSticker = useCallback((tier, family) => setSelection({ tier, family }), []);
  const closeSticker = useCallback(() => setSelection(null), []);

  if (isLoading && !stickers) {
    return <div className="album album--loading" aria-busy="true" aria-label={t("stickers.loading")} />;
  }

  if (error) {
    return (
      <section className="progress-card progress-error" role="alert">
        <h2>{t("stickers.errors.title")}</h2>
        <p>{t("progress.errors.text")}</p>
        <button type="button" className="ui-button ui-button--secondary" onClick={refreshOverview}>
          {t("common.tryAgain")}
        </button>
      </section>
    );
  }

  const share = stickers.totalCount > 0 ? (stickers.earnedCount / stickers.totalCount) * 100 : 0;

  return (
    <div className="album">
      <Link className="album__back" to={ROUTE_PATHS.progress}>
        <IoArrowBack aria-hidden />
        {t("nav.progress")}
      </Link>

      <header className="album__head">
        <p className="album__count">
          {withEmphasis(t("stickers.albumCount", { earned: stickers.earnedCount, count: stickers.totalCount }))}
        </p>
        <div
          className="album__meter"
          role="meter"
          aria-label={t("stickers.earnedLabel")}
          aria-valuemin={0}
          aria-valuemax={stickers.totalCount}
          aria-valuenow={stickers.earnedCount}
        >
          <span style={{ width: `${share}%` }} />
        </div>
        <p className="album__lede">
          {stickers.newCount > 0
            ? t("stickers.newSince", { count: stickers.newCount })
            : t("stickers.tapHint")}
        </p>
      </header>

      <div className="album__families">
        {stickers.families.map((family) => {
          const earned = family.tiers.filter((tier) => tier.earned).length;

          return (
            <section key={family.key} className="album-family" aria-labelledby={`album-${family.key}`}>
              <header className="album-family__head">
                <h2 id={`album-${family.key}`}>{stickerTitle(i18n, family.key)}</h2>
                <span className="album-family__count">
                  {formatNumber(earned)} / {formatNumber(family.tiers.length)}
                </span>
                <p>{describeFamilyNow(i18n, family, overview)}</p>
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
