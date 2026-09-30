import { useCallback } from "react";
import { EXTERNAL_LINKS } from "@shared/config/externalLinks";
import { LANGUAGE_OPTIONS } from "@shared/config/languages";
import { ROUTE_PATHS } from "@shared/config/routes";
import {
  APP_PREFERENCES_APP_KEY,
  mergeAppPreferences,
  normalizeAppPreferences,
} from "@shared/lib/appPreferences";
import { usePlatformService } from "@shared/providers";
import { READY_LOCALES, useI18n } from "@shared/lib/i18n";
import { prefetchAppAssets } from "@shared/lib/pwa";

// Every language a deck can use, straight from the app's own list, so the
// landing never promises fewer or more than the deck editor offers.
const LANGUAGE_TONES = ["blue", "red", "amber", "green"];
const DECK_LANGUAGES = LANGUAGE_OPTIONS.map((name, index) => ({
  name,
  tone: LANGUAGE_TONES[index % LANGUAGE_TONES.length],
}));

const AUTHOR_URL = "https://mark-storchovyi.com";
const AUTHOR_NAME = "Mark Storchovyi";
// A deck from the hub, by the name its author gave it.
const HUB_EXAMPLE_DECK = "Game of Thrones B1–C2";

// Example decks for the "your decks" illustration; the names are read in
// the page's language.
const EXAMPLE_DECKS = [
  { key: "travel", pair: "EN · PL · RU", words: 200, tone: "blue" },
  { key: "falseFriends", pair: "PL · UK", words: 250, tone: "green" },
  { key: "business", pair: "DE · PL", words: 200, tone: "amber" },
];

// Each platform card leads somewhere: the web app, or the desktop download.
// A phone installs the web app from its browser, so it opens the app too.
const PLATFORMS = [
  { key: "web", to: ROUTE_PATHS.learn },
  { key: "desktop", href: EXTERNAL_LINKS.githubReleases },
  { key: "phone", to: ROUTE_PATHS.learn },
];

const FOOTER_LINKS = [
  { key: "github", href: EXTERNAL_LINKS.githubRepo, isExternal: true },
  { key: "issues", href: EXTERNAL_LINKS.githubIssues, isExternal: true },
  { key: "contact", href: EXTERNAL_LINKS.contactEmail, isExternal: false },
];

export const useLandingMockPanel = () => {
  const { locale } = useI18n();
  const settingsRepository = usePlatformService("settingsRepository");

  const prefetchApp = useCallback(() => {
    void prefetchAppAssets();
  }, []);

  // The same setting as the app's own language picker: a visitor who picks
  // a language here finds the app in it too. The stored preferences are read
  // at the moment of the change, so only the language moves, even before
  // this page has finished loading them.
  const handleLanguageChange = useCallback(
    async (event) => {
      const interfaceLanguage = event.target.value;

      try {
        const settings = await settingsRepository.getAppSettings();
        const current = normalizeAppPreferences(settings?.[APP_PREFERENCES_APP_KEY]);

        await settingsRepository.updateAppSettings({
          [APP_PREFERENCES_APP_KEY]: mergeAppPreferences(current, {
            uiAccessibility: { interfaceLanguage },
          }),
        });
      } catch (error) {
        console.warn("[landing] language change failed", error);
      }
    },
    [settingsRepository],
  );

  return {
    locale,
    locales: READY_LOCALES,
    handleLanguageChange,
    deckLanguages: DECK_LANGUAGES,
    exampleDecks: EXAMPLE_DECKS,
    authorUrl: AUTHOR_URL,
    authorName: AUTHOR_NAME,
    hubExampleDeck: HUB_EXAMPLE_DECK,
    platforms: PLATFORMS,
    footerLinks: FOOTER_LINKS,
    openWebTo: ROUTE_PATHS.learn,
    browseTo: ROUTE_PATHS.browse,
    desktopReleaseUrl: EXTERNAL_LINKS.githubReleases,
    handlePrefetchApp: prefetchApp,
  };
};
