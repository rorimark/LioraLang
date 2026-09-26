import { useCallback } from "react";
import { EXTERNAL_LINKS } from "@shared/config/externalLinks";
import { ROUTE_PATHS } from "@shared/config/routes";
import { prefetchAppAssets } from "@shared/lib/pwa";

// A few examples: decks take any language pair.
const DECK_LANGUAGES = [
  { name: "English", tone: "blue" },
  { name: "Polish", tone: "red" },
  { name: "German", tone: "amber" },
  { name: "Russian", tone: "green" },
  { name: "Ukrainian", tone: "blue" },
];

const AUTHOR_URL = "https://mark-storchovyi.com";

// Example decks for the "your decks" illustration.
const EXAMPLE_DECKS = [
  { name: "Travel & Tourism", pair: "EN · PL · RU", words: 200, tone: "blue" },
  { name: "False Friends & Cognates", pair: "PL · UK", words: 250, tone: "green" },
  { name: "Business & Startup Culture", pair: "DE · PL", words: 200, tone: "amber" },
];

const PLATFORMS = [
  { key: "web", title: "Web", text: "Any browser, nothing to install" },
  { key: "desktop", title: "macOS & Windows", text: "Desktop app, fully offline" },
  { key: "phone", title: "Phone", text: "Add to Home Screen" },
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
