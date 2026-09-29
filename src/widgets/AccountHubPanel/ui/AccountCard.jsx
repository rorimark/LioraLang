import { memo, useCallback, useRef, useState } from "react";
import { FiCheck, FiRotateCw } from "react-icons/fi";
import { IoBook, IoCalendar, IoFlame, IoFlash, IoInfinite, IoLayers, IoSparkles, IoTrophy } from "react-icons/io5";
import { AppIcon } from "@shared/ui";
import { formatStickerValue } from "@shared/lib/stickers";
import { resolveInitial } from "../model";
import "./AccountCard.css";

const INTEGER = new Intl.NumberFormat("en-US");

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

// The card leans towards the pointer and the sheen follows it. Written
// straight to CSS variables: a pointer move never re-renders React.
const useTilt = () => {
  const ref = useRef(null);

  const handlePointerMove = useCallback((event) => {
    const card = ref.current;

    if (
      !card ||
      event.pointerType !== "mouse" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      return;
    }

    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    card.style.setProperty("--tilt-x", `${(0.5 - y) * 10}deg`);
    card.style.setProperty("--tilt-y", `${(x - 0.5) * 14}deg`);
    card.style.setProperty("--glare-x", `${x * 100}%`);
    card.style.setProperty("--glare-y", `${y * 100}%`);
    card.classList.add("is-tilting");
  }, []);

  const handlePointerLeave = useCallback(() => {
    const card = ref.current;

    if (!card) {
      return;
    }

    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.classList.remove("is-tilting");
  }, []);

  return { ref, handlePointerMove, handlePointerLeave };
};

const CardSticker = ({ tier, index }) => {
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
      <small>{tier.target === 1 ? tier.family.unitOne : tier.family.unit}</small>
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
  const initial = resolveInitial(name);
  const hasStats = Boolean(stats);

  return (
    <div className="acard__face acard__front">
      <div className="acard__band">
        <span className="acard__brand">
          <AppIcon size={26} />
          LioraLang
        </span>
      </div>

      <div className="acard__who">
        <span className="acard__avatar" aria-hidden>
          {initial || "?"}
        </span>
        <div className="acard__who-text">
          <strong className={name ? "acard__name" : "acard__name is-placeholder"}>{name || "Your name"}</strong>
          <span className={email ? "acard__email" : "acard__email is-placeholder"}>{email || "you@example.com"}</span>
        </div>
      </div>

      <div className="acard__row">
      <dl className="acard__stats">
        <Stat value={hasStats ? INTEGER.format(stats.known) : "—"} label="words known" />
        <Stat value={hasStats ? INTEGER.format(stats.streak) : "—"} label="day streak" />
        <Stat
          value={hasStats ? INTEGER.format(stats.stickersEarned) : "—"}
          label={hasStats ? `of ${stats.stickersTotal} stickers` : "stickers"}
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
          Learner card
          <span className="acard__dot" aria-hidden>
            ·
          </span>
          {isBlank ? "not issued yet" : memberSince ? `member since ${memberSince}` : "member"}
        </span>
        <span className="acard__number">{isBlank ? "LL •••• ••••" : cardNumber}</span>
      </div>

      {!isBlank && !isVerified ? (
        <span className="acard__stamp" aria-hidden>
          Email not confirmed
        </span>
      ) : null}

      <span className="acard__glare" aria-hidden />
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
    <span className="acard__glare" />
  </div>
);

export const AccountCard = memo(
  ({ name, email, memberSince, cardNumber, stats, isVerified = true, perks = [], isBlank = false }) => {
    const { ref, handlePointerMove, handlePointerLeave } = useTilt();
    const [isTurned, setIsTurned] = useState(false);
    const canTurn = !isBlank && perks.length > 0;
    const turn = useCallback(() => setIsTurned((current) => !current), []);

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
        aria-label={isBlank ? "Your learner card, not issued yet" : `Learner card of ${name}`}
      >
        <div className="acard__body" onClick={canTurn ? turn : undefined}>
          <CardFront
            name={name}
            email={email}
            memberSince={memberSince}
            cardNumber={cardNumber}
            stats={stats}
            isVerified={isVerified}
            isBlank={isBlank}
          />
          {canTurn ? <CardBack name={name} perks={perks} /> : null}
          {stats?.recentStickers?.length ? (
            <div className="acard__stickers" aria-hidden>
              {stats.recentStickers.map((tier, index) => (
                <CardSticker key={tier.id} tier={tier} index={index} />
              ))}
            </div>
          ) : null}
        </div>
        {canTurn ? (
          <button
            type="button"
            className="acard__turn"
            onClick={turn}
            aria-pressed={isTurned}
            aria-label={isTurned ? "Show the front of the card" : "Show the back of the card"}
          >
            <FiRotateCw aria-hidden />
            <span>{isTurned ? "Front" : "Turn over"}</span>
          </button>
        ) : null}
      </div>
    );
  },
);

AccountCard.displayName = "AccountCard";
