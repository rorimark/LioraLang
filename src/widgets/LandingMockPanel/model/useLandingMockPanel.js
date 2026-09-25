import { useCallback } from "react";
import { EXTERNAL_LINKS } from "@shared/config/externalLinks";
import { ROUTE_PATHS } from "@shared/config/routes";
import { prefetchAppAssets } from "@shared/lib/pwa";

// One row per page of the app, in the order of its navigation. The icon keys
// match NAV_ITEMS so the landing shows the same icons as the sidebar.
const APP_SECTIONS = [
  {
    key: "learn",
    title: "Learn",
    text: "One queue a day. Flip the card, grade it Again, Hard, Good or Easy, move on. Space and 1–4 on the keyboard.",
  },
  {
    key: "decks",
    title: "Decks",
    text: "Your own decks for any language pair, with levels, tags and example sentences. Import and export as JSON.",
  },
  {
    key: "browse",
    title: "Browse",
    text: "LioraLangHub: decks other learners published, imported in one click. Publish yours the same way.",
  },
  {
    key: "progress",
    title: "Progress",
    text: "Reviews per day, recall, streaks and your most active decks, so you can see what is sticking.",
  },
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
    appSections: APP_SECTIONS,
    footerLinks: FOOTER_LINKS,
    openWebTo: ROUTE_PATHS.learn,
    desktopReleaseUrl: EXTERNAL_LINKS.githubReleases,
    githubRepoUrl: EXTERNAL_LINKS.githubRepo,
    handlePrefetchApp: prefetchApp,
  };
};
