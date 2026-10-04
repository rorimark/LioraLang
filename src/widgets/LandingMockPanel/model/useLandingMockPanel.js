import { useCallback } from "react";
import { useNavigate } from "react-router";
import { EXTERNAL_LINKS } from "@shared/config/externalLinks";
import { buildLandingRoute, ROUTE_PATHS } from "@shared/config/routes";
import {
  APP_PREFERENCES_APP_KEY,
  mergeAppPreferences,
  normalizeAppPreferences,
} from "@shared/lib/appPreferences";
import { usePlatformService } from "@shared/providers";
import { READY_LOCALES, storeLocaleChoice, useI18n } from "@shared/lib/i18n";
import { prefetchAppAssets } from "@shared/lib/pwa";

const AUTHOR_URL = "https://mark-storchovyi.com";
const AUTHOR_NAME = "Mark Storchovyi";
// A deck from the hub, by the name its author gave it.
const HUB_EXAMPLE_DECK = "Game of Thrones B1–C2";

// Example decks for the "your decks" illustration; the names are read in
// the page's language.
const EXAMPLE_DECKS = [
  { key: "travel", pair: "EN · PL · RU", words: 200, tone: "blue" },
  { key: "falseFriends", pair: "JavaScript", words: 40, tone: "green" },
  { key: "business", pair: "x² = 4", words: 30, tone: "amber" },
];

// Each platform card leads somewhere: the web app, or the desktop download.
// A phone installs the web app from its browser, so it opens the app too.
const PLATFORMS = [
  { key: "web", to: ROUTE_PATHS.learn },
  { key: "desktop", href: EXTERNAL_LINKS.githubReleases },
  { key: "phone", to: ROUTE_PATHS.learn },
];

// The two ways a phone puts the web app on its home screen.
const PHONE_SYSTEMS = [
  { key: "ios", tone: "blue" },
  { key: "android", tone: "green" },
];

// Every language of the landing, each at its own address.
const LANGUAGE_LINKS = READY_LOCALES.map((item) => ({
  code: item.code,
  nativeName: item.nativeName,
  to: buildLandingRoute(item.code),
}));

const FOOTER_LINKS = [
  { key: "github", href: EXTERNAL_LINKS.githubRepo, isExternal: true },
  { key: "issues", href: EXTERNAL_LINKS.githubIssues, isExternal: true },
  { key: "contact", href: EXTERNAL_LINKS.contactEmail, isExternal: false },
];

export const useLandingMockPanel = () => {
  const { locale } = useI18n();
  const navigate = useNavigate();
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

      // The page moves to that language's address at once; the choice is
      // kept first, so / does not send the visitor back to the old one.
      storeLocaleChoice(interfaceLanguage);
      navigate(buildLandingRoute(interfaceLanguage));

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
    [navigate, settingsRepository],
  );

  return {
    locale,
    locales: READY_LOCALES,
    handleLanguageChange,
    exampleDecks: EXAMPLE_DECKS,
    authorUrl: AUTHOR_URL,
    authorName: AUTHOR_NAME,
    hubExampleDeck: HUB_EXAMPLE_DECK,
    platforms: PLATFORMS,
    footerLinks: FOOTER_LINKS,
    languageLinks: LANGUAGE_LINKS,
    openWebTo: ROUTE_PATHS.learn,
    createDeckTo: ROUTE_PATHS.deckCreate,
    browseTo: ROUTE_PATHS.browse,
    desktopReleaseUrl: EXTERNAL_LINKS.githubReleases,
    phoneSystems: PHONE_SYSTEMS,
    handlePrefetchApp: prefetchApp,
  };
};
