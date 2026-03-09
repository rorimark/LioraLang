import { useCallback } from "react";
import { ROUTE_PATHS } from "@shared/config/routes";
import { prefetchAppAssets } from "@shared/lib/pwa";

const LANDING_FEATURES = [
  {
    title: "Offline-first decks",
    description: "Create and edit decks locally with no server required.",
  },
  {
    title: "Spaced repetition",
    description: "Rate cards as Again, Hard, Good, or Easy and keep momentum.",
  },
  {
    title: "Import and share",
    description: "Import deck files, export your own, and publish to LioraLangHub.",
  },
];

export const useLandingMockPanel = () => {
  const prefetchApp = useCallback(() => {
    void prefetchAppAssets();
  }, []);

  return {
    features: LANDING_FEATURES,
    primaryCtaTo: ROUTE_PATHS.learn,
    secondaryCtaTo: ROUTE_PATHS.decks,
    handlePrefetchApp: prefetchApp,
  };
};
