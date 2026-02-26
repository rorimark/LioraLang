export const ROUTE_PATHS = {
  root: "/",
  learn: "/learn",
  decks: "/decks",
  deckCreate: "/decks/new",
  deckEdit: "/decks/:deckId/edit",
  deckDetails: "/decks/:deckId",
  progress: "/progress",
  settings: "/settings",
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
  [ROUTE_PATHS.settings]: {
    title: "Settings",
    subtitle: "Tune preferences for SRS cadence and workspace behavior.",
  },
  default: {
    title: "LioraLang",
    subtitle: "Language learning workspace",
  },
};

export const resolvePageMeta = (pathname) => {
  if (pathname === ROUTE_PATHS.deckCreate) {
    return PAGE_META[ROUTE_PATHS.deckEdit];
  }

  if (/^\/decks\/[^/]+\/edit$/.test(pathname)) {
    return PAGE_META[ROUTE_PATHS.deckEdit];
  }

  if (pathname.startsWith("/decks/")) {
    return PAGE_META[ROUTE_PATHS.deckDetails];
  }

  return PAGE_META[pathname] ?? PAGE_META.default;
};
