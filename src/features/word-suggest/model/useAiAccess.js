import { useEffect, useMemo, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { isAiEnabled, isAiFeatureEnabled } from "@shared/config/aiFeatures";
import { useI18n } from "@shared/lib/i18n";

// The interface language by its English name, the way the assistant is told
// which language to write tags, deck names and hints in.
export const languageNameOf = (locale) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(String(locale || "en").split("-")[0]) || "";
  } catch {
    return "";
  }
};

// Whether the assistant can be asked here: the app has it, the person has
// not turned it off, and someone is signed in (the allowance is theirs).
export const useAiAccess = ({ enabled = true, feature = null } = {}) => {
  const repository = usePlatformService("wordSuggestRepository");
  const authRepository = usePlatformService("authRepository");
  const { appPreferences, isLoaded } = useAppPreferences();
  const { locale } = useI18n();
  const isWanted =
    enabled &&
    isLoaded !== false &&
    isAiEnabled(appPreferences) &&
    (!feature || isAiFeatureEnabled(appPreferences, feature)) &&
    Boolean(repository) &&
    Boolean(authRepository?.isConfigured?.());
  const [isSignedIn, setIsSignedIn] = useState(null);

  useEffect(() => {
    if (!isWanted) {
      return undefined;
    }

    let isLive = true;
    const update = (snapshot) => {
      if (isLive) setIsSignedIn(Boolean(snapshot?.isAuthenticated));
    };

    authRepository.getSnapshot().then(update).catch(() => update(null));
    const unsubscribe = authRepository.subscribe(update);

    return () => {
      isLive = false;
      unsubscribe?.();
    };
  }, [authRepository, isWanted]);

  const language = useMemo(() => languageNameOf(locale), [locale]);

  return {
    repository,
    isWanted,
    isReady: isWanted && isSignedIn === true,
    needsSignIn: isWanted && isSignedIn === false,
    language,
  };
};
