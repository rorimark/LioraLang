// What the learner card says, from the account and the learning stats.
// Pure, so every line of it can be tested.

// The weeks of activity the card has room for: about four months.
export const CARD_ACTIVITY_WEEKS = 17;

// A card number made from the account id: stable, readable, and saying
// nothing about the account that is not already on the card.
export const buildCardNumber = (userId) => {
  const hex = String(userId || "").replace(/[^0-9a-f]/gi, "").toUpperCase();

  if (hex.length < 8) {
    return "";
  }

  return `LL ${hex.slice(0, 4)} ${hex.slice(4, 8)}`;
};

// Month and year as on a bank card, "09/2026", in the language's own
// numerals and separator (takes useI18n()'s value).
export const formatMemberSince = (createdAt, { formatDate }) =>
  createdAt ? formatDate(createdAt, { month: "2-digit", year: "numeric" }) : "";

// The name the card shows: the display name, or the part of the email
// before the @, or nothing yet.
export const resolveCardName = ({ displayName, email }) => {
  const name = String(displayName || "").trim();

  if (name) {
    return name;
  }

  return String(email || "").split("@")[0].trim();
};

export const resolveInitial = (name) => String(name || "").trim().charAt(0).toUpperCase();

// The learning numbers on the card, from the progress payload and the
// stickers merged with this device's ledger.
export const buildCardStats = ({ overview, stickers }) => {
  const days = Array.isArray(overview?.activity?.days) ? overview.activity.days : [];

  return {
    known: Number(overview?.known) || 0,
    streak: Number(overview?.streak?.current) || 0,
    stickersEarned: stickers?.earnedCount || 0,
    stickersTotal: stickers?.totalCount || 0,
    recentStickers: (stickers?.recent || []).slice(0, 3),
    activity: days.slice(-CARD_ACTIVITY_WEEKS * 7),
  };
};
