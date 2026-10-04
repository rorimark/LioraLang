import { BRAND_NAME } from "@shared/config/brand";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiRotateCw } from "react-icons/fi";
import { IoBook, IoCalendar, IoFlame, IoFlash, IoInfinite, IoLayers, IoSparkles, IoTrophy } from "react-icons/io5";
import { AppIcon } from "@shared/ui";
import { formatStickerValue, stickerUnit } from "@shared/lib/stickers";
import { resolveInitial } from "../model";
import "./AccountCard.css";
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

const TILTS = [-10, 7, -4];

// The card leans towards the pointer and a glare follows it. Written
// straight to CSS variables once a frame, and only ever as transforms:
// a pointer move never re-renders React and never repaints the card.
const useTilt = () => {
  const ref = useRef(null);
  const frameRef = useRef(0);
  const pointRef = useRef(null);

  const apply = useCallback(() => {
    frameRef.current = 0;
    const card = ref.current;
    const point = pointRef.current;

    if (!card || !point) {
      return;
    }

    card.style.setProperty("--tilt-x", `${(0.5 - point.y) * 10}deg`);
    card.style.setProperty("--tilt-y", `${(point.x - 0.5) * 14}deg`);
    card.style.setProperty("--glare-x", `${point.x * point.width}px`);
    card.style.setProperty("--glare-y", `${point.y * point.height}px`);
  }, []);

  const handlePointerMove = useCallback(
    (event) => {
      const card = ref.current;

      if (
        !card ||
        event.pointerType !== "mouse" ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
      ) {
        return;
      }

      const rect = card.getBoundingClientRect();
      pointRef.current = {
        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
        y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
        width: rect.width,
        height: rect.height,
      };
      card.classList.add("is-tilting");

      if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(apply);
      }
    },
    [apply],
  );

  const handlePointerLeave = useCallback(() => {
    const card = ref.current;

    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;

    if (card) {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.classList.remove("is-tilting");
    }
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return { ref, handlePointerMove, handlePointerLeave };
};

// Turning over: the card swings to its edge, the side changes there, and
// it swings back. One side is ever drawn, so no browser can show both or
// neither.
const FLIP_MS = 560;

const useTurn = () => {
  const [isTurned, setIsTurned] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const turn = useCallback(() => {
    if (isFlipping) {
      return;
    }

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setIsTurned((current) => !current);
      return;
    }

    setIsFlipping(true);
    timersRef.current = [
      setTimeout(() => setIsTurned((current) => !current), FLIP_MS / 2),
      setTimeout(() => setIsFlipping(false), FLIP_MS),
    ];
  }, [isFlipping]);

  return { isTurned, isFlipping, turn };
};

const CardSticker = ({ tier, index }) => {
  const i18n = useI18n();
  const Icon = STICKER_ICONS[tier.family.key] || IoTrophy;

  return (
    <span
      className="acard__sticker"
      style={{
        "--sticker-fill": `var(--sticker-${tier.family.key})`,
        "--sticker-tilt": `${TILTS[index % TILTS.length]}deg`,
        "--sticker-delay": `${300 + index * 110}ms`,
      }}
    >
      <Icon aria-hidden />
      <strong>{formatStickerValue(tier.target)}</strong>
      <small>{stickerUnit(i18n, tier.family.key, tier.target)}</small>
    </span>
  );
};

const Stat = ({ value, label }) => (
  <div className="acard__stat">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

// The front: who, how far along, since when.
const CardFront = ({ name, email, memberSince, cardNumber, stats, isVerified, isBlank }) => {
  const { t, formatNumber } = useI18n();
  const initial = resolveInitial(name);
  const hasStats = Boolean(stats);

  return (
    <div className="acard__face acard__front">
      <div className="acard__band">
        <span className="acard__brand">
          <AppIcon size={26} />
          {BRAND_NAME}
        </span>
      </div>

      <div className="acard__who">
        <span className="acard__avatar" aria-hidden>
          {initial || "?"}
        </span>
        <div className="acard__who-text">
          <strong className={name ? "acard__name" : "acard__name is-placeholder"}>{name || t("account.card.yourName")}</strong>
          <span className={email ? "acard__email" : "acard__email is-placeholder"}>{email || t("account.emailPlaceholder")}</span>
        </div>
      </div>

      <div className="acard__row">
      <dl className="acard__stats">
        <Stat
          value={hasStats ? formatNumber(stats.known) : "—"}
          label={t("account.card.wordsKnown", { count: hasStats ? stats.known : 0 })}
        />
        <Stat
          value={hasStats ? formatNumber(stats.streak) : "—"}
          label={t("account.card.dayStreak", { count: hasStats ? stats.streak : 0 })}
        />
        <Stat
          value={hasStats ? formatNumber(stats.stickersEarned) : "—"}
          label={
            hasStats
              ? t("account.card.ofStickers", { count: stats.stickersTotal })
              : t("account.card.stickers")
          }
        />
      </dl>

      <div className="acard__activity" aria-hidden>
        {(stats?.activity?.length ? stats.activity : Array.from({ length: 119 }, () => ({ level: 0 }))).map(
          (day, index) => (
            <span key={index} className={day ? `is-level-${day.level}` : "is-future"} />
          ),
        )}
      </div>
      </div>

      <div className="acard__foot">
        <span>
          {t("account.card.title")}
          <span className="acard__dot" aria-hidden>
            ·
          </span>
          {isBlank
            ? t("account.card.notIssued")
            : memberSince
              ? t("account.card.memberSince", { date: memberSince })
              : t("account.card.member")}
        </span>
        <span className="acard__number">{isBlank ? "LL •••• ••••" : cardNumber}</span>
      </div>

      {!isBlank && !isVerified ? (
        <span className="acard__stamp" aria-hidden>
          {t("account.card.unconfirmed")}
        </span>
      ) : null}
    </div>
  );
};

// The back: what the card lets you do, and the signature strip.
const CardBack = ({ name, perks }) => (
  <div className="acard__face acard__back" aria-hidden>
    <div className="acard__stripe" />
    <ul className="acard__perks">
      {perks.map((perk) => (
        <li key={perk.key} className={perk.isOn ? "is-on" : ""}>
          <span className="acard__perk-mark">{perk.isOn ? <FiCheck /> : null}</span>
          <span>
            <strong>{perk.title}</strong>
            <small>{perk.note}</small>
          </span>
        </li>
      ))}
    </ul>
    <div className="acard__signature">
      <span>{name}</span>
    </div>
  </div>
);

export const AccountCard = memo(
  ({ name, email, memberSince, cardNumber, stats, isVerified = true, perks = [], isBlank = false }) => {
    const { t } = useI18n();
    const { ref, handlePointerMove, handlePointerLeave } = useTilt();
    const { isTurned, isFlipping, turn } = useTurn();
    const canTurn = !isBlank && perks.length > 0;

    return (
      <div
        ref={ref}
        className={[
          "acard",
          isBlank ? "acard--blank" : "",
          isTurned ? "is-turned" : "",
          !isBlank && !isVerified ? "is-unverified" : "",
        ].join(" ")}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        role="group"
        aria-label={isBlank ? t("account.card.blankLabel") : t("account.card.label", { name })}
      >
        <div className="acard__tilt">
          <div
            className={isFlipping ? "acard__flip is-flipping" : "acard__flip"}
            style={{ "--flip-ms": `${FLIP_MS}ms` }}
            onClick={canTurn ? turn : undefined}
          >
            {isTurned ? (
              <CardBack name={name} perks={perks} />
            ) : (
              <CardFront
                name={name}
                email={email}
                memberSince={memberSince}
                cardNumber={cardNumber}
                stats={stats}
                isVerified={isVerified}
                isBlank={isBlank}
              />
            )}
            <span className="acard__glare-clip" aria-hidden>
              <span className="acard__glare" />
            </span>
            {!isTurned && stats?.recentStickers?.length ? (
              <div className="acard__stickers" aria-hidden>
                {stats.recentStickers.map((tier, index) => (
                  <CardSticker key={tier.id} tier={tier} index={index} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {canTurn ? (
          <button
            type="button"
            className="acard__turn"
            onClick={turn}
            aria-pressed={isTurned}
            aria-label={isTurned ? t("account.card.showFront") : t("account.card.showBack")}
          >
            <FiRotateCw aria-hidden />
            <span>{isTurned ? t("account.card.front") : t("account.card.turn")}</span>
          </button>
        ) : null}
      </div>
    );
  },
);

AccountCard.displayName = "AccountCard";
