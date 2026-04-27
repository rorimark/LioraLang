import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { buildBrowseDeckRoute } from "@shared/config/routes";
import { copyTextToClipboard } from "@shared/lib/clipboard";

const DEFAULT_AUTH_STATE = Object.freeze({
  session: null,
  user: null,
  isAuthenticated: false,
  isAnonymous: false,
  isEmailVerified: false,
  email: "",
  displayName: "",
  provider: "email",
});

const SIGNED_OUT_TAB_ITEMS = [
  { key: "sign-in", label: "Sign in" },
  { key: "sign-up", label: "Create account" },
  { key: "reset", label: "Reset password" },
];

const SIGNED_IN_TAB_ITEMS = [
  { key: "overview", label: "Overview" },
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security" },
  { key: "hub", label: "My Hub decks" },
];

const SOCIAL_PROVIDERS = [
  { key: "google", label: "Continue with Google" },
  { key: "github", label: "Continue with GitHub" },
];

const toVariant = (value) => {
  if (value === "success" || value === "warning" || value === "error" || value === "danger") {
    return value;
  }

  return "info";
};

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const isDesktopUserAgent = () => {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") {
    return false;
  }

  return navigator.userAgent.includes("Electron");
};

const buildPublicDeckUrl = (slug) => {
  const normalizedSlug = toCleanString(slug);

  if (!normalizedSlug) {
    return "";
  }

  const deckPath = buildBrowseDeckRoute(normalizedSlug);
  const envBase =
    typeof import.meta.env?.VITE_PUBLIC_APP_URL === "string"
      ? import.meta.env.VITE_PUBLIC_APP_URL.trim()
      : "";

  if (envBase) {
    return `${envBase.replace(/\/+$/, "")}${deckPath}`;
  }

  if (typeof window !== "undefined") {
    const origin = window.location?.origin || "";

    if (origin.startsWith("http")) {
      return `${origin}${deckPath}`;
    }
  }

  return deckPath;
};

const stripAuthParamsFromUrl = () => {
  if (typeof window === "undefined" || typeof window.history?.replaceState !== "function") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete("code");
  nextUrl.searchParams.delete("error");
  nextUrl.searchParams.delete("error_code");
  nextUrl.searchParams.delete("error_description");
  nextUrl.hash = "";
  window.history.replaceState({}, document.title, `${nextUrl.pathname}${nextUrl.search}`);
};

const resolveAuthRedirectPayload = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const searchParams = url.searchParams;
  const errorDescription =
    toCleanString(searchParams.get("error_description")) ||
    toCleanString(hashParams.get("error_description")) ||
    toCleanString(searchParams.get("error")) ||
    toCleanString(hashParams.get("error"));

  if (errorDescription) {
    return {
      type: "error",
      message: errorDescription,
    };
  }

  const code = toCleanString(searchParams.get("code"));

  if (code) {
    return {
      type: "code",
      code,
    };
  }

  const accessToken = toCleanString(hashParams.get("access_token"));
  const refreshToken = toCleanString(hashParams.get("refresh_token"));
  const redirectType = toCleanString(hashParams.get("type"));

  if (accessToken && refreshToken) {
    return {
      type: "token",
      accessToken,
      refreshToken,
      isRecovery: redirectType === "recovery",
    };
  }

  return null;
};

export const useAccountHubPanel = () => {
  const authRepository = usePlatformService("authRepository");
  const hubRepository = usePlatformService("hubRepository");
  const syncRepository = usePlatformService("syncRepository");
  const runtimeGateway = usePlatformService("runtimeGateway");
  const [authState, setAuthState] = useState(DEFAULT_AUTH_STATE);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sign-in");
  const [statusText, setStatusText] = useState("");
  const [statusVariant, setStatusVariant] = useState("info");
  const [pendingAction, setPendingAction] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [ownDecks, setOwnDecks] = useState([]);
  const [isOwnDecksLoading, setIsOwnDecksLoading] = useState(false);
  const [ownDecksError, setOwnDecksError] = useState("");
  const [deletingHubDeckId, setDeletingHubDeckId] = useState("");
  const [syncStatus, setSyncStatus] = useState({
    configured: false,
    signedIn: false,
    syncing: false,
    online: true,
    lastErrorMessage: "",
    lastSuccessfulSyncAt: "",
    pendingDeckChanges: 0,
    pendingProgressChanges: 0,
  });
  const handledRedirectRef = useRef(false);
  const syncProfileRef = useRef(false);

  const isConfigured = authRepository.isConfigured();
  const isDesktopMode = runtimeGateway.isDesktopMode?.() ?? isDesktopUserAgent();

  const reportStatus = useCallback((text, variant = "info") => {
    setStatusText(text);
    setStatusVariant(toVariant(variant));
  }, []);

  const clearStatus = useCallback(() => {
    setStatusText("");
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setIsAuthLoading(false);
      setAuthState(DEFAULT_AUTH_STATE);
      return undefined;
    }

    let isSubscribed = true;

    const syncInitialSession = async () => {
      setIsAuthLoading(true);

      try {
        const redirectPayload = handledRedirectRef.current
          ? null
          : resolveAuthRedirectPayload();

        handledRedirectRef.current = true;

        if (redirectPayload?.type === "error") {
          stripAuthParamsFromUrl();
          throw new Error(redirectPayload.message || "Failed to complete sign-in");
        }

        let nextAuthState = null;

        if (redirectPayload?.type === "code") {
          nextAuthState = await authRepository.exchangeCodeForSession(redirectPayload.code);
          stripAuthParamsFromUrl();
          reportStatus("Signed in successfully.", "success");
          setIsRecoveryFlow(false);
        } else if (redirectPayload?.type === "token") {
          nextAuthState = await authRepository.setSessionFromTokens({
            accessToken: redirectPayload.accessToken,
            refreshToken: redirectPayload.refreshToken,
          });
          stripAuthParamsFromUrl();
          if (redirectPayload.isRecovery) {
            setIsRecoveryFlow(true);
            setActiveTab("security");
            reportStatus("Set a new password to finish account recovery.", "warning");
          } else {
            reportStatus("Signed in successfully.", "success");
          }
        }

        if (!nextAuthState) {
          nextAuthState = await authRepository.getSnapshot();
        }

        if (!isSubscribed) {
          return;
        }

        setAuthState(nextAuthState || DEFAULT_AUTH_STATE);
      } catch (error) {
        if (!isSubscribed) {
          return;
        }

        reportStatus(error?.message || "Failed to load account session", "error");
      } finally {
        if (isSubscribed) {
          setIsAuthLoading(false);
        }
      }
    };

    const unsubscribe = authRepository.subscribe((nextAuthState) => {
      if (!isSubscribed) {
        return;
      }

      setAuthState(nextAuthState || DEFAULT_AUTH_STATE);
    });

    void syncInitialSession();

    return () => {
      isSubscribed = false;
      unsubscribe?.();
    };
  }, [authRepository, isConfigured, reportStatus]);

  useEffect(() => {
    if (!syncRepository?.isConfigured?.()) {
      setSyncStatus((currentStatus) => ({
        ...currentStatus,
        configured: false,
      }));
      return undefined;
    }

    let isSubscribed = true;

    syncRepository
      .getStatus()
      .then((nextStatus) => {
        if (isSubscribed && nextStatus) {
          setSyncStatus(nextStatus);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setSyncStatus((currentStatus) => ({
            ...currentStatus,
            configured: true,
          }));
        }
      });

    const unsubscribe = syncRepository.subscribe((nextStatus) => {
      if (isSubscribed && nextStatus) {
        setSyncStatus(nextStatus);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe?.();
    };
  }, [syncRepository]);

  useEffect(() => {
    if (syncProfileRef.current && authState.isAuthenticated) {
      return;
    }

    if (!authState.isAuthenticated) {
      return;
    }

    syncProfileRef.current = true;
    setDisplayName(authState.displayName || "");
    setEmail(authState.email || "");
    setResetEmail(authState.email || "");
    setActiveTab((currentTab) => (currentTab === "sign-in" || currentTab === "sign-up" || currentTab === "reset" ? "overview" : currentTab));
  }, [authState.displayName, authState.email, authState.isAuthenticated]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      return;
    }

    syncProfileRef.current = false;
    setOwnDecks([]);
    setOwnDecksError("");
    setIsOwnDecksLoading(false);
    setDeletingHubDeckId("");
    setIsRecoveryFlow(false);
    setNextPassword("");
    setConfirmPassword("");
    setDisplayName("");
    setEmail("");
    setResetEmail("");
    setActiveTab((currentTab) => (SIGNED_OUT_TAB_ITEMS.some((item) => item.key === currentTab) ? currentTab : "sign-in"));
  }, [authState.isAuthenticated]);

  useEffect(() => {
    if (!authState.isAuthenticated || !hubRepository.isConfigured()) {
      return undefined;
    }

    let isSubscribed = true;
    setIsOwnDecksLoading(true);
    setOwnDecksError("");

    hubRepository
      .listOwnDecks()
      .then((items) => {
        if (!isSubscribed) {
          return;
        }

        setOwnDecks(Array.isArray(items) ? items : []);
      })
      .catch((error) => {
        if (!isSubscribed) {
          return;
        }

        setOwnDecks([]);
        setOwnDecksError(error?.message || "Failed to load your Hub decks");
      })
      .finally(() => {
        if (isSubscribed) {
          setIsOwnDecksLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [authState.isAuthenticated, hubRepository]);

  const runAction = useCallback(async (actionKey, callback) => {
    setPendingAction(actionKey);
    clearStatus();

    try {
      await callback();
    } catch (error) {
      reportStatus(error?.message || "Account action failed", "error");
    } finally {
      setPendingAction("");
    }
  }, [clearStatus, reportStatus]);

  const handleSignIn = useCallback(async () => {
    await runAction("sign-in", async () => {
      const nextAuthState = await authRepository.signInWithPassword({ email, password });
      setAuthState(nextAuthState);
      setPassword("");
      reportStatus("Signed in successfully.", "success");
      setActiveTab("overview");
    });
  }, [authRepository, email, password, reportStatus, runAction]);

  const handleSignUp = useCallback(async () => {
    await runAction("sign-up", async () => {
      const nextAuthState = await authRepository.signUpWithPassword({
        email,
        password,
        displayName,
      });

      setPassword("");
      setAuthState((currentState) => ({
        ...currentState,
        ...nextAuthState,
      }));

      if (nextAuthState?.pendingEmailConfirmation) {
        reportStatus("Account created. Check your email and confirm your address before publishing to Hub.", "success");
        setActiveTab("sign-in");
        return;
      }

      reportStatus("Account created and signed in.", "success");
      setActiveTab("overview");
    });
  }, [authRepository, displayName, email, password, reportStatus, runAction]);

  const handlePasswordResetRequest = useCallback(async () => {
    await runAction("reset-password", async () => {
      await authRepository.sendPasswordResetEmail(resetEmail || email);
      reportStatus("Password reset email sent. Use the link in your inbox to finish recovery.", "success");
    });
  }, [authRepository, email, reportStatus, resetEmail, runAction]);

  const handleSocialSignIn = useCallback(async (provider) => {
    await runAction(`social-${provider}`, async () => {
      await authRepository.signInWithProvider(provider);
      reportStatus(`Redirecting to ${provider} sign-in...`, "success");
    });
  }, [authRepository, reportStatus, runAction]);

  const handleResendVerification = useCallback(async () => {
    await runAction("resend-verification", async () => {
      await authRepository.resendVerification(authState.email || email);
      reportStatus("Verification email sent. Confirm your inbox before publishing to Hub.", "success");
    });
  }, [authRepository, authState.email, email, reportStatus, runAction]);

  const handleSaveProfile = useCallback(async () => {
    await runAction("save-profile", async () => {
      const nextAuthState = await authRepository.updateProfile({ displayName });
      setAuthState((currentState) => ({
        ...currentState,
        ...nextAuthState,
      }));
      reportStatus("Profile updated.", "success");
    });
  }, [authRepository, displayName, reportStatus, runAction]);

  const handleUpdatePassword = useCallback(async () => {
    const normalizedPassword = String(nextPassword || "");
    const normalizedConfirmPassword = String(confirmPassword || "");

    if (normalizedPassword.length < 10) {
      reportStatus("Use at least 10 characters for your new password.", "error");
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      reportStatus("New password and confirmation do not match.", "error");
      return;
    }

    await runAction("update-password", async () => {
      await authRepository.updatePassword(normalizedPassword);
      setNextPassword("");
      setConfirmPassword("");
      setIsRecoveryFlow(false);
      reportStatus("Password updated successfully.", "success");
    });
  }, [authRepository, confirmPassword, nextPassword, reportStatus, runAction]);

  const handleSignOut = useCallback(async () => {
    await runAction("sign-out", async () => {
      await authRepository.signOut();
      setAuthState(DEFAULT_AUTH_STATE);
      setActiveTab("sign-in");
      reportStatus("Signed out.", "success");
    });
  }, [authRepository, reportStatus, runAction]);

  const handleDeleteHubDeck = useCallback(async (deck) => {
    const deckId = toCleanString(deck?.id);

    if (!deckId) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Delete "${deck?.title || "this deck"}" from LioraLangHub?`);

      if (!confirmed) {
        return;
      }
    }

    setDeletingHubDeckId(deckId);
    clearStatus();

    try {
      await hubRepository.deleteDeck(deckId);
      setOwnDecks((currentDecks) => currentDecks.filter((item) => String(item?.id) !== deckId));
      reportStatus("Hub deck deleted.", "danger");
    } catch (error) {
      reportStatus(error?.message || "Failed to delete Hub deck", "error");
    } finally {
      setDeletingHubDeckId("");
    }
  }, [clearStatus, hubRepository, reportStatus]);

  const handleCopyDeckLink = useCallback(async (deck) => {
    const publicUrl = buildPublicDeckUrl(deck?.slug);

    if (!publicUrl) {
      reportStatus("Public deck link is not available.", "error");
      return;
    }

    const copied = await copyTextToClipboard(publicUrl);
    reportStatus(
      copied ? "Public deck link copied." : "Failed to copy deck link.",
      copied ? "success" : "error",
    );
  }, [reportStatus]);

  const isBusy = Boolean(pendingAction);
  const statusAlert = useMemo(
    () => ({ text: statusText, variant: statusVariant, onClose: clearStatus }),
    [clearStatus, statusText, statusVariant],
  );
  const signedOutTabs = useMemo(() => SIGNED_OUT_TAB_ITEMS, []);
  const signedInTabs = useMemo(() => SIGNED_IN_TAB_ITEMS, []);
  const syncOverview = useMemo(() => {
    if (!syncStatus.configured) {
      return {
        label: "Unavailable",
        text: "Supabase sync is not configured yet.",
      };
    }

    if (!authState.isAuthenticated) {
      return {
        label: "Guest mode",
        text: "Sign in to sync progress and decks across devices.",
      };
    }

    if (!syncStatus.online) {
      return {
        label: "Offline",
        text: "Changes stay local and will sync when the device is online again.",
      };
    }

    if (syncStatus.lastErrorMessage) {
      return {
        label: "Needs attention",
        text: syncStatus.lastErrorMessage,
      };
    }

    if (syncStatus.syncing) {
      return {
        label: "Syncing",
        text: "Sync is running in the background right now.",
      };
    }

    if (syncStatus.lastSuccessfulSyncAt) {
      return {
        label: "Synced",
        text: "Decks and study progress are connected across your signed-in devices.",
      };
    }

    return {
      label: "Ready",
      text: "Sync is available and will start once there are changes to exchange.",
    };
  }, [
    authState.isAuthenticated,
    syncStatus.configured,
    syncStatus.lastErrorMessage,
    syncStatus.lastSuccessfulSyncAt,
    syncStatus.online,
    syncStatus.syncing,
  ]);

  const overviewCards = useMemo(() => {
    return [
      {
        key: "verification",
        title: "Email verification",
        value: authState.isEmailVerified ? "Verified" : "Confirmation pending",
        note: authState.isEmailVerified
          ? "Publishing and Hub management are enabled."
          : "Confirm your email before publishing or deleting Hub decks.",
      },
      {
        key: "sync",
        title: "Sync",
        value: syncOverview.label,
        note: syncOverview.text,
      },
      {
        key: "hub-decks",
        title: "Published Hub decks",
        value: String(ownDecks.length),
        note:
          ownDecks.length > 0
            ? "Manage links and delete published decks from this account."
            : "No Hub decks are attached to this account yet.",
      },
      {
        key: "provider",
        title: "Sign-in method",
        value: authState.provider === "email" ? "Email and password" : authState.provider,
        note: isDesktopMode ? "Desktop session" : "Web session",
      },
    ];
  }, [
    authState.isEmailVerified,
    authState.provider,
    isDesktopMode,
    ownDecks.length,
    syncOverview.label,
    syncOverview.text,
  ]);

  const accountBadges = useMemo(() => {
    const badges = [];

    if (authState.provider) {
      badges.push({
        key: "provider",
        text: authState.provider === "email" ? "Email" : authState.provider,
      });
    }

    badges.push({
      key: "verification",
      text: authState.isEmailVerified ? "Verified" : "Email not verified",
      accent: authState.isEmailVerified,
    });

    if (isDesktopMode) {
      badges.push({ key: "runtime", text: "Desktop app" });
    }

    return badges;
  }, [authState.isEmailVerified, authState.provider, isDesktopMode]);

  return {
    isConfigured,
    isDesktopMode,
    isAuthLoading,
    authState,
    activeTab,
    isBusy,
    pendingAction,
    statusAlert,
    signedOutTabs,
    signedInTabs,
    socialProviders: SOCIAL_PROVIDERS,
    accountBadges,
    syncStatus,
    syncOverview,
    overviewCards,
    email,
    password,
    displayName,
    resetEmail,
    nextPassword,
    confirmPassword,
    isRecoveryFlow,
    ownDecks,
    isOwnDecksLoading,
    ownDecksError,
    deletingHubDeckId,
    setActiveTab,
    setEmail,
    setPassword,
    setDisplayName,
    setResetEmail,
    setNextPassword,
    setConfirmPassword,
    handleSignIn,
    handleSignUp,
    handlePasswordResetRequest,
    handleSocialSignIn,
    handleResendVerification,
    handleSaveProfile,
    handleUpdatePassword,
    handleSignOut,
    handleDeleteHubDeck,
    handleCopyDeckLink,
  };
};
