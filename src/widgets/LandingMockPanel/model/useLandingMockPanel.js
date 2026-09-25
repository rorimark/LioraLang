import { useCallback } from "react";
import { EXTERNAL_LINKS } from "@shared/config/externalLinks";
import { NAV_ITEMS, ROUTE_PATHS } from "@shared/config/routes";
import { prefetchAppAssets } from "@shared/lib/pwa";

const HERO_HIGHLIGHTS = [
  {
    title: "Offline-first",
    subtitle: "Local data stays yours",
    iconKey: "offline",
  },
  {
    title: "Flexible decks",
    subtitle: "Any language setup",
    iconKey: "deck",
  },
  {
    title: "SRS grading",
    subtitle: "Again · Hard · Good · Easy",
    iconKey: "srs",
  },
  {
    title: "Platforms",
    subtitle: "Web · macOS · Windows",
    iconKey: "platforms",
  },
];

const FEATURE_CARDS = [
  {
    title: "Deck studio",
    points: ["Multi-language", "Tags", "Examples", "Levels"],
    iconKey: "deck",
  },
  {
    title: "Study engine",
    points: ["Stable queue", "Daily goals", "Keyboard flow"],
    iconKey: "study",
  },
  {
    title: "Data control",
    points: ["Import/export", "Integrity checks", "Local DB tools"],
    iconKey: "control",
  },
];

const START_OPTIONS = [
  {
    title: "Web app",
    description: "Open instantly with full features.",
    actionLabel: "Open in browser",
    to: ROUTE_PATHS.learn,
    iconKey: "web",
  },
  {
    title: "Desktop app",
    description: "Offline mode with local SQLite storage.",
    actionLabel: "Download builds",
    href: EXTERNAL_LINKS.githubReleases,
    iconKey: "desktop",
  },
];

const HUB_HIGHLIGHTS = [
  "Browse community decks",
  "Import in one click",
  "Publish your own packs",
  "Keep a clean local library",
];

const MOBILE_STEPS = [
  "Open LioraLang in Safari or Chrome on your phone.",
  "Tap Share or the browser menu, then choose Add to Home Screen.",
  "Launch it like a native app and keep learning offline-first.",
];

const SECTION_LINKS = [
  { id: "features", title: "Features" },
  { id: "hub", title: "Hub" },
  { id: "mobile", title: "Mobile" },
];

// What the hero preview shows: one card mid-review, as the Learn page
// renders it, with the grading buttons and their next intervals.
const PREVIEW_CARD = {
  language: "Polish",
  level: "B1",
  front: "abstraction",
  back: "pojęcie abstrakcyjne",
  example: "Abstract ideas shape design decisions.",
};

const PREVIEW_RATINGS = [
  { label: "Again", interval: "10m", tone: "danger" },
  { label: "Hard", interval: "15m", tone: "warning" },
  { label: "Good", interval: "24h", tone: "neutral" },
  { label: "Easy", interval: "3d", tone: "success" },
];

const CONTACT_LINKS = [
  {
    title: "GitHub repository",
    description: "Source code, roadmap, and release notes.",
    href: EXTERNAL_LINKS.githubRepo,
    openInNewTab: true,
  },
  {
    title: "Issues and feature requests",
    description: "Report bugs or suggest improvements.",
    href: EXTERNAL_LINKS.githubIssues,
    openInNewTab: true,
  },
  {
    title: "Contact",
    description: "Direct feedback and partnership requests.",
    href: EXTERNAL_LINKS.contactEmail,
    openInNewTab: false,
  },
];

export const useLandingMockPanel = () => {
  const prefetchApp = useCallback(() => {
    void prefetchAppAssets();
  }, []);

  return {
    heroHighlights: HERO_HIGHLIGHTS,
    featureCards: FEATURE_CARDS,
    startOptions: START_OPTIONS,
    hubHighlights: HUB_HIGHLIGHTS,
    mobileSteps: MOBILE_STEPS,
    sectionLinks: SECTION_LINKS,
    previewNavItems: NAV_ITEMS,
    previewCard: PREVIEW_CARD,
    previewRatings: PREVIEW_RATINGS,
    contactLinks: CONTACT_LINKS,
    openWebTo: ROUTE_PATHS.learn,
    desktopReleaseUrl: EXTERNAL_LINKS.githubReleases,
    githubRepoUrl: EXTERNAL_LINKS.githubRepo,
    handlePrefetchApp: prefetchApp,
  };
};
