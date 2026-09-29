export const ROUTE_PATHS = {
  root: "/",
  landing: "/",
  shareDeck: "/share/decks/:deckSlug",
  appRoot: "/app",
  learn: "/app/learn",
  browse: "/app/browse",
  browseDeck: "/app/browse/:deckSlug",
  decks: "/app/decks",
  deckCreate: "/app/decks/new",
  deckEdit: "/app/decks/:deckId/edit",
  deckDetails: "/app/decks/:deckId",
  progress: "/app/progress",
  progressStickers: "/app/progress/stickers",
  account: "/app/account",
  settings: "/app/settings",
};

export const LEGACY_ROUTE_PATHS = {
  shareDeck: "/share/decks/:deckSlug",
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

export const buildShareDeckRoute = (deckSlug) => {
  const routeParam = toRouteParam(deckSlug);

  if (!routeParam) {
    return ROUTE_PATHS.browse;
  }

  return `/share/decks/${routeParam}`;
};

export const NAV_ITEMS = [
  {
    key: "learn",
    to: ROUTE_PATHS.learn,
    titleKey: "nav.learn",
    icon: "learn",
  },
  {
    key: "decks",
    to: ROUTE_PATHS.decks,
    titleKey: "nav.decks",
    icon: "decks",
  },
  {
    key: "browse",
    to: ROUTE_PATHS.browse,
    titleKey: "nav.browse",
    icon: "browse",
  },
  {
    key: "progress",
    to: ROUTE_PATHS.progress,
    titleKey: "nav.progress",
    icon: "progress",
  },
  {
    key: "settings",
    to: ROUTE_PATHS.settings,
    titleKey: "nav.settings",
    icon: "settings",
  },
];

// Each page's title and description live in the messages under
// pages.<key> (title, subtitle), in every interface language.
export const PAGE_META = {
  [ROUTE_PATHS.learn]: { key: "pages.learn" },
  [ROUTE_PATHS.browse]: { key: "pages.browse" },
  [ROUTE_PATHS.browseDeck]: { key: "pages.browseDeck" },
  [ROUTE_PATHS.decks]: { key: "pages.decks" },
  [ROUTE_PATHS.deckDetails]: { key: "pages.deckDetails" },
  [ROUTE_PATHS.deckEdit]: { key: "pages.deckEdit" },
  [ROUTE_PATHS.progress]: { key: "pages.progress" },
  [ROUTE_PATHS.progressStickers]: { key: "pages.stickers" },
  [ROUTE_PATHS.account]: { key: "pages.account" },
  [ROUTE_PATHS.settings]: { key: "pages.settings" },
  default: { key: "pages.default" },
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
