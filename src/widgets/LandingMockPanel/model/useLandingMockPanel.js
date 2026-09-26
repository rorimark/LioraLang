import { useCallback } from "react";
import { EXTERNAL_LINKS } from "@shared/config/externalLinks";
import { ROUTE_PATHS } from "@shared/config/routes";
import { prefetchAppAssets } from "@shared/lib/pwa";

// Languages covered by the decks bundled in sample-decks/.
const DECK_LANGUAGES = ["English", "Polish", "German", "Russian", "Ukrainian"];

// Three of the bundled decks with their real word counts, for the deck
// library illustration.
const SAMPLE_DECKS = [
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
    sampleDecks: SAMPLE_DECKS,
    platforms: PLATFORMS,
    footerLinks: FOOTER_LINKS,
    openWebTo: ROUTE_PATHS.learn,
    browseTo: ROUTE_PATHS.browse,
    desktopReleaseUrl: EXTERNAL_LINKS.githubReleases,
    handlePrefetchApp: prefetchApp,
  };
};
