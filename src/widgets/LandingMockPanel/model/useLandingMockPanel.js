import { useCallback } from "react";
import { EXTERNAL_LINKS } from "@shared/config/externalLinks";
import { ROUTE_PATHS } from "@shared/config/routes";
import { prefetchAppAssets } from "@shared/lib/pwa";

const HERO_METRICS = [
  {
    value: "Offline-first",
    label: "Learn without permanent internet connection",
  },
  {
    value: "Desktop + Web",
    label: "One workflow on macOS, Windows, and browser",
  },
  {
    value: "Open format",
    label: "Import and export decks with full control",
  },
];

const LANDING_FEATURES = [
  {
    title: "Build your own deck system",
    description:
      "Create decks for any language pair, add words with levels and examples, and keep everything structured with tags.",
  },
  {
    title: "Train with real spaced repetition",
    description:
      "Review cards with Again, Hard, Good, and Easy grades so the next session focuses on what still needs work.",
  },
  {
    title: "Share and discover with LioraLangHub",
    description:
      "Import ready-made packs, publish your own decks, and grow your vocabulary with community collections.",
  },
];

const WORKFLOW_STEPS = [
  "Create a deck and choose source and target language setup.",
  "Add words, parts of speech, levels, examples, and tags.",
  "Run focused study sessions with keyboard shortcuts and clean controls.",
  "Track progress and adjust your SRS settings to keep momentum.",
];

const CONTACT_LINKS = [
  {
    title: "GitHub repository",
    description: "Explore source code, roadmap, and release notes.",
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
    heroMetrics: HERO_METRICS,
    features: LANDING_FEATURES,
    workflowSteps: WORKFLOW_STEPS,
    contactLinks: CONTACT_LINKS,
    openWebTo: ROUTE_PATHS.learn,
    exploreDecksTo: ROUTE_PATHS.browse,
    desktopReleaseUrl: EXTERNAL_LINKS.githubReleases,
    githubRepoUrl: EXTERNAL_LINKS.githubRepo,
    handlePrefetchApp: prefetchApp,
  };
};
