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
import { formatDay, formatInteger, formatStickerValue } from "../model";
import "./Sticker.css";

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

const describeStickerStatus = (tier, family) => {
  if (tier.earned) {
    return tier.isDated ? `Earned on ${formatDay(tier.earnedOn)}` : `Earned by ${formatDay(tier.earnedOn)}`;
  }

  const left = tier.target - tier.progress;

  return `${formatInteger(tier.progress)} of ${formatInteger(tier.target)} ${tier.target === 1 ? family.unitOne : family.unit}, ${formatInteger(left)} to go`;
};

export const Sticker = memo(({ tier, family, index = 0, size = "md", onOpen }) => {
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
          ? `${family.title} ${formatStickerValue(tier.target)}: ${tier.description} ${describeStickerStatus(tier, family)}.${tier.isNew ? " New." : ""}`
          : undefined
      }
      aria-hidden={onOpen ? undefined : true}
      onClick={onOpen ? () => onOpen(tier, family) : undefined}
    >
      <span className="sticker__face" aria-hidden>
        <Icon className="sticker__icon" />
        <strong className="sticker__value">{formatStickerValue(tier.target)}</strong>
        <span className="sticker__unit">{tier.target === 1 ? family.unitOne : family.unit}</span>
      </span>
      {tier.isNew ? (
        <span className="sticker__new" aria-hidden>
          New
        </span>
      ) : null}
    </Tag>
  );
});

Sticker.displayName = "Sticker";

// A closer look at one sticker: what it asks for and where you stand.
export const StickerDialog = memo(({ selection, onClose }) => {
  const tier = selection?.tier;
  const family = selection?.family;

  return (
    <ActionModal
      dialog={{
        isOpen: Boolean(tier),
        title: family ? `${family.title} ${formatStickerValue(tier.target)}` : "",
        onClose,
        renderActions: ({ onClose: close }) => (
          <div className="action-modal__actions">
            <button type="button" onClick={close} data-autofocus>
              Close
            </button>
          </div>
        ),
      }}
    >
      {tier ? (
        <div className="sticker-dialog">
          <Sticker tier={{ ...tier, isNew: false }} family={family} size="lg" />
          <div className="sticker-dialog__text">
            <p className="sticker-dialog__goal">{tier.description}</p>
            <p className="sticker-dialog__status">{describeStickerStatus(tier, family)}</p>
            {tier.earned ? null : (
              <div
                className="sticker-dialog__meter"
                role="meter"
                aria-label={`${family.title} progress`}
                aria-valuemin={0}
                aria-valuemax={tier.target}
                aria-valuenow={tier.progress}
              >
                <span style={{ width: `${tier.share}%` }} />
              </div>
            )}
            {tier.earned && !tier.isDated ? (
              <p className="sticker-dialog__note">
                Counted from your words as they are, so the day shown is when this device first saw it earned.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </ActionModal>
  );
});

StickerDialog.displayName = "StickerDialog";
