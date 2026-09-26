import { useCallback } from "react";
import { EXTERNAL_LINKS } from "@shared/config/externalLinks";
import { LANGUAGE_OPTIONS } from "@shared/config/languages";
import { ROUTE_PATHS } from "@shared/config/routes";
import { prefetchAppAssets } from "@shared/lib/pwa";

// Every language a deck can use, straight from the app's own list, so the
// landing never promises fewer or more than the deck editor offers.
const LANGUAGE_TONES = ["blue", "red", "amber", "green"];
const DECK_LANGUAGES = LANGUAGE_OPTIONS.map((name, index) => ({
  name,
  tone: LANGUAGE_TONES[index % LANGUAGE_TONES.length],
}));

const AUTHOR_URL = "https://mark-storchovyi.com";

// Example decks for the "your decks" illustration.
const EXAMPLE_DECKS = [
  { name: "Travel & Tourism", pair: "EN · PL · RU", words: 200, tone: "blue" },
  { name: "False Friends & Cognates", pair: "PL · UK", words: 250, tone: "green" },
  { name: "Business & Startup Culture", pair: "DE · PL", words: 200, tone: "amber" },
];

// Each platform card leads somewhere: the web app, or the desktop download.
// A phone installs the web app from its browser, so it opens the app too.
const PLATFORMS = [
  { key: "web", title: "Web", text: "Any browser, nothing to install", to: ROUTE_PATHS.learn },
  {
    key: "desktop",
    title: "macOS & Windows",
    text: "Desktop app, fully offline",
    href: EXTERNAL_LINKS.githubReleases,
  },
  { key: "phone", title: "Phone", text: "Add to Home Screen", to: ROUTE_PATHS.learn },
];

const FOOTER_LINKS = [
  { title: "GitHub", href: EXTERNAL_LINKS.githubRepo, isExternal: true },
  { title: "Issues", href: EXTERNAL_LINKS.githubIssues, isExternal: true },
  { title: "Contact", href: EXTERNAL_LINKS.contactEmail, isExternal: false },
];

export const useLandingMockPanel = () => {
  const prefetchApp = useCallback(() => {
    void prefetchAppAssets();
  }, []);

  return {
    deckLanguages: DECK_LANGUAGES,
    exampleDecks: EXAMPLE_DECKS,
    authorUrl: AUTHOR_URL,
    platforms: PLATFORMS,
    footerLinks: FOOTER_LINKS,
    openWebTo: ROUTE_PATHS.learn,
    browseTo: ROUTE_PATHS.browse,
    desktopReleaseUrl: EXTERNAL_LINKS.githubReleases,
    handlePrefetchApp: prefetchApp,
  };
};
