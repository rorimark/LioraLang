export const ROUTE_PATHS = {
  root: "/",
  landing: "/",
  appRoot: "/app",
  learn: "/app/learn",
  browse: "/app/browse",
  browseDeck: "/app/browse/:deckSlug",
  decks: "/app/decks",
  deckCreate: "/app/decks/new",
  deckEdit: "/app/decks/:deckId/edit",
  deckDetails: "/app/decks/:deckId",
  progress: "/app/progress",
  account: "/app/account",
  settings: "/app/settings",
};

export const LEGACY_ROUTE_PATHS = {
  learn: "/learn",
  browse: "/browse",
  decks: "/decks",
  deckCreate: "/decks/new",
  deckEdit: "/decks/:deckId/edit",
  deckDetails: "/decks/:deckId",
  progress: "/progress",
  account: "/account",
  settings: "/settings",
};

const toRouteParam = (value) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "";
  }

  return encodeURIComponent(normalizedValue);
};

export const buildDeckDetailsRoute = (deckId) => {
  const routeParam = toRouteParam(deckId);

  if (!routeParam) {
    return ROUTE_PATHS.decks;
  }

  return `${ROUTE_PATHS.decks}/${routeParam}`;
};

export const buildDeckEditRoute = (deckId) => {
  const routeParam = toRouteParam(deckId);

  if (!routeParam) {
    return ROUTE_PATHS.decks;
  }

  return `${ROUTE_PATHS.decks}/${routeParam}/edit`;
};

export const buildBrowseDeckRoute = (deckSlug) => {
  const routeParam = toRouteParam(deckSlug);

  if (!routeParam) {
    return ROUTE_PATHS.browse;
  }

  return `${ROUTE_PATHS.browse}/${routeParam}`;
};

export const NAV_ITEMS = [
  {
    key: "learn",
    to: ROUTE_PATHS.learn,
    title: "Learn",
    icon: "learn",
  },
  {
    key: "decks",
    to: ROUTE_PATHS.decks,
    title: "Decks",
    icon: "decks",
  },
  {
    key: "browse",
    to: ROUTE_PATHS.browse,
    title: "Browse",
    icon: "browse",
  },
  {
    key: "progress",
    to: ROUTE_PATHS.progress,
    title: "Progress",
    icon: "progress",
  },
  {
    key: "settings",
    to: ROUTE_PATHS.settings,
    title: "Settings",
    icon: "settings",
  },
];

export const PAGE_META = {
  [ROUTE_PATHS.learn]: {
    title: "Flashcards",
    subtitle: "Pick a deck and review cards in a focused study session.",
  },
  [ROUTE_PATHS.browse]: {
    title: "Browse Decks",
    subtitle: "Discover community deck packages and import them in one click.",
  },
  [ROUTE_PATHS.browseDeck]: {
    title: "Community Deck",
    subtitle: "Explore a shared deck and import it to your library.",
  },
  [ROUTE_PATHS.decks]: {
    title: "Deck Library",
    subtitle: "Manage local decks, inspect content, and export to JSON.",
  },
  [ROUTE_PATHS.deckDetails]: {
    title: "Deck Details",
    subtitle: "Browse words, filter entries, and review deck content.",
  },
  [ROUTE_PATHS.deckEdit]: {
    title: "Deck Editor",
    subtitle: "Configure deck languages, add words, and keep your base updated.",
  },
  [ROUTE_PATHS.progress]: {
    title: "Learning Progress",
    subtitle: "Track retention, streaks, and spaced-repetition efficiency.",
  },
  [ROUTE_PATHS.account]: {
    title: "Account",
    subtitle: "Sign in, register, and manage your profile and sync options.",
  },
  [ROUTE_PATHS.settings]: {
    title: "Settings",
    subtitle: "Tune preferences for SRS cadence and workspace behavior.",
  },
  default: {
    title: "LioraLang",
    subtitle: "Language learning workspace",
  },
};

const DECK_EDIT_ROUTE_PATTERN = /^\/app\/decks\/[^/]+\/edit$/;
const DECK_DETAILS_ROUTE_PREFIX = "/app/decks/";
const BROWSE_DECK_ROUTE_PREFIX = "/app/browse/";

export const resolvePageMeta = (pathname) => {
  if (pathname === ROUTE_PATHS.deckCreate) {
    return PAGE_META[ROUTE_PATHS.deckEdit];
  }

  if (DECK_EDIT_ROUTE_PATTERN.test(pathname)) {
    return PAGE_META[ROUTE_PATHS.deckEdit];
  }

  if (pathname.startsWith(DECK_DETAILS_ROUTE_PREFIX)) {
    return PAGE_META[ROUTE_PATHS.deckDetails];
  }

  if (pathname.startsWith(BROWSE_DECK_ROUTE_PREFIX)) {
    return PAGE_META[ROUTE_PATHS.browseDeck];
  }

  return PAGE_META[pathname] ?? PAGE_META.default;
};
