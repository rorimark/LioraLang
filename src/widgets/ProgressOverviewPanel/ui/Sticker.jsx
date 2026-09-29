import { memo } from "react";
import {
  IoBook,
  IoCalendar,
  IoFlame,
  IoFlash,
  IoInfinite,
  IoLayers,
  IoSparkles,
  IoTrophy,
} from "react-icons/io5";
import { ActionModal } from "@shared/ui";
import { formatStickerValue, stickerGoal, stickerStatus, stickerTitle, stickerUnit } from "../model";
import "./Sticker.css";
import { useI18n } from "@shared/lib/i18n";

const STICKER_ICONS = {
  known: IoBook,
  streak: IoFlame,
  mature: IoInfinite,
  days: IoCalendar,
  reviews: IoLayers,
  bigDay: IoFlash,
  cleanSheet: IoSparkles,
  decks: IoTrophy,
};

// Each sticker is set down a little crooked, like the grade stickers on
// the Learn screen; the tilt comes from its place, so it never jumps.
const TILTS = [-4, 3, -2, 5, -5, 2, -3, 4];

const resolveState = (tier) => {
  if (tier.earned) {
    return "earned";
  }

  return tier.isNext ? "next" : "locked";
};

export const Sticker = memo(({ tier, family, index = 0, size = "md", onOpen }) => {
  const i18n = useI18n();
  const Icon = STICKER_ICONS[family.key] || IoTrophy;
  const state = resolveState(tier);
  // In the dialog the sticker is a picture, not a control.
  const Tag = onOpen ? "button" : "span";

  return (
    <Tag
      type={onOpen ? "button" : undefined}
      className={[
        "sticker",
        `sticker--${size}`,
        `is-${state}`,
        tier.isNew ? "is-new" : "",
      ].join(" ")}
      style={{
        "--sticker-tilt": `${TILTS[index % TILTS.length]}deg`,
        "--sticker-fill": `var(--sticker-${family.key})`,
        "--sticker-share": `${tier.share}%`,
        "--sticker-delay": `${Math.min(index, 10) * 45}ms`,
      }}
      aria-label={
        onOpen
          ? i18n.t(tier.isNew ? "stickers.ariaNew" : "stickers.aria", {
            title: stickerTitle(i18n, family.key),
            value: formatStickerValue(tier.target),
            goal: stickerGoal(i18n, tier),
            status: stickerStatus(i18n, tier),
          })
          : undefined
      }
      aria-hidden={onOpen ? undefined : true}
      onClick={onOpen ? () => onOpen(tier, family) : undefined}
    >
      <span className="sticker__face" aria-hidden>
        <Icon className="sticker__icon" />
        <strong className="sticker__value">{formatStickerValue(tier.target)}</strong>
        <span className="sticker__unit">{stickerUnit(i18n, family.key, tier.target)}</span>
      </span>
      {tier.isNew ? (
        <span className="sticker__new" aria-hidden>
          {i18n.t("stickers.new")}
        </span>
      ) : null}
    </Tag>
  );
});

Sticker.displayName = "Sticker";

// A closer look at one sticker: what it asks for and where you stand.
export const StickerDialog = memo(({ selection, onClose }) => {
  const i18n = useI18n();
  const tier = selection?.tier;
  const family = selection?.family;

  return (
    <ActionModal
      dialog={{
        isOpen: Boolean(tier),
        title: family ? `${stickerTitle(i18n, family.key)} ${formatStickerValue(tier.target)}` : "",
        onClose,
        renderActions: ({ onClose: close }) => (
          <div className="action-modal__actions">
            <button type="button" onClick={close} data-autofocus>
              {i18n.t("common.close")}
            </button>
          </div>
        ),
      }}
    >
      {tier ? (
        <div className="sticker-dialog">
          <Sticker tier={{ ...tier, isNew: false }} family={family} size="lg" />
          <div className="sticker-dialog__text">
            <p className="sticker-dialog__goal">{stickerGoal(i18n, tier)}</p>
            <p className="sticker-dialog__status">{stickerStatus(i18n, tier)}</p>
            {tier.earned ? null : (
              <div
                className="sticker-dialog__meter"
                role="meter"
                aria-label={i18n.t("stickers.progressLabel", { title: stickerTitle(i18n, family.key) })}
                aria-valuemin={0}
                aria-valuemax={tier.target}
                aria-valuenow={tier.progress}
              >
                <span style={{ width: `${tier.share}%` }} />
              </div>
            )}
            {tier.earned && !tier.isDated ? (
              <p className="sticker-dialog__note">
                {i18n.t("stickers.undatedNote")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </ActionModal>
  );
});

StickerDialog.displayName = "StickerDialog";
