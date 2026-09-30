import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { usePlatformService } from "@shared/providers";
import { copyTextToClipboard } from "@shared/lib/clipboard";
import { buildPublicDeckShareUrl } from "@shared/lib/share";
import { useI18n } from "@shared/lib/i18n";
import { groupDevices } from "./deviceList";

const DEFAULT_AUTH_STATE = Object.freeze({
  session: null,
  user: null,
  isAuthenticated: false,
  isAnonymous: false,
  isEmailVerified: false,
  email: "",
  displayName: "",
  provider: "email",
  pendingEmail: "",
  hasPassword: false,
  linkedProviders: [],
});

// Labels are account.tabs.<key>.
const SIGNED_OUT_TAB_ITEMS = [{ key: "sign-in" }, { key: "sign-up" }, { key: "reset" }];

// What the account is (the card, its status) is always on screen above
// these; the tabs are for changing things. Each is its own address
// (?tab=), so Back returns to the previous one and a link can open one.
const SIGNED_IN_TAB_ITEMS = [{ key: "profile" }, { key: "security" }, { key: "devices" }, { key: "hub" }];
const SIGNED_IN_TAB_KEYS = new Set(SIGNED_IN_TAB_ITEMS.map((item) => item.key));
export const ACCOUNT_TAB_QUERY_KEY = "tab";
const DEFAULT_SIGNED_IN_TAB = "profile";

// Before signing out, unsent changes get this long to reach the server.
const SIGN_OUT_SYNC_WAIT_MS = 8000;

const PROVIDER_NAMES = { google: "Google", github: "GitHub" };

const SOCIAL_PROVIDERS = [{ key: "google" }, { key: "github" }];

// Supabase error codes the interface explains in its own words
// (account.authErrors.<code>); any other failure gets the action's
// general message, and its cause goes to the console.
const KNOWN_AUTH_ERRORS = new Set([
  "invalid_credentials",
  "email_not_confirmed",
  "user_already_exists",
  "email_exists",
  "weak_password",
  "same_password",
  "email_address_invalid",
  "over_email_send_rate_limit",
  "social_port_busy",
  "social_timeout",
  "social_cancelled",
  "social_failed",
  "over_request_rate_limit",
  "signup_disabled",
  "missing_credentials",
  "missing_email",
  "missing_password",
  "social_desktop_unavailable",
]);

const describeFailure = (error, fallbackKey) => {
  const code = String(error?.code || "");

  if (KNOWN_AUTH_ERRORS.has(code)) {
    return { key: `account.authErrors.${code}` };
  }

  console.warn(error);
  return { key: fallbackKey };
};

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

const buildDeckSharePreviewKey = (deck) => {
  const versionToken =
    deck?.latestVersion?.version != null ? `v${String(deck.latestVersion.version).trim()}` : "";
  const timestampToken = Date.now().toString(36);
  return [versionToken, timestampToken].filter(Boolean).join("-");
};

const isDesktopUserAgent = () => {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") {
    return false;
  }

  return navigator.userAgent.includes("Electron");
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
  // Signing in, signing up and the reset form are steps of one form, kept
  // in state; the signed-in tabs live in the address.
  const [signedOutTab, setSignedOutTab] = useState("sign-in");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get(ACCOUNT_TAB_QUERY_KEY);
  const signedInTab = SIGNED_IN_TAB_KEYS.has(requestedTab) ? requestedTab : DEFAULT_SIGNED_IN_TAB;
  // On a phone the account opens on its menu; a section is its own screen.
  const isSectionRequested = SIGNED_IN_TAB_KEYS.has(requestedTab);
  // The router hands out a new setter on every change of address; kept in
  // a ref, so switching tabs never looks like a new session to the effects
  // that depend on this.
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;
  const setActiveTab = useCallback(
    (key, { replace = false } = {}) => {
      if (!SIGNED_IN_TAB_KEYS.has(key)) {
        setSignedOutTab(key);
        return;
      }

      setSearchParamsRef.current(
        (current) => {
          const next = new URLSearchParams(current);

          next.set(ACCOUNT_TAB_QUERY_KEY, key);
          return next;
        },
        { replace },
      );
    },
    [],
  );
  // A message key and its values, said in the current language on render.
  const [status, setStatus] = useState(null);
  const { t } = useI18n();
  const [statusVariant, setStatusVariant] = useState("info");
  const [pendingAction, setPendingAction] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [devices, setDevices] = useState([]);
  const [devicesState, setDevicesState] = useState("idle");
  const [forgettingDeviceId, setForgettingDeviceId] = useState("");
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

  const reportStatus = useCallback((message, variant = "info") => {
    setStatus(message?.key ? message : null);
    setStatusVariant(toVariant(variant));
  }, []);

  const clearStatus = useCallback(() => {
    setStatus(null);
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
          throw Object.assign(new Error(redirectPayload.message || "sign-in failed"), { code: "redirect" });
        }

        let nextAuthState = null;

        if (redirectPayload?.type === "code") {
          nextAuthState = await authRepository.exchangeCodeForSession(redirectPayload.code);
          stripAuthParamsFromUrl();
          reportStatus({ key: "account.status.signedIn" }, "success");
          setIsRecoveryFlow(false);
        } else if (redirectPayload?.type === "token") {
          nextAuthState = await authRepository.setSessionFromTokens({
            accessToken: redirectPayload.accessToken,
            refreshToken: redirectPayload.refreshToken,
          });
          stripAuthParamsFromUrl();
          if (redirectPayload.isRecovery) {
            setIsRecoveryFlow(true);
            setActiveTab("security", { replace: true });
            reportStatus({ key: "account.status.setNewPassword" }, "warning");
          } else {
            reportStatus({ key: "account.status.signedIn" }, "success");
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

        reportStatus(describeFailure(error, "account.errors.session"), "error");
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
  }, [authRepository, isConfigured, reportStatus, setActiveTab]);

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
  }, [authState.displayName, authState.email, authState.isAuthenticated]);

  // The email field starts at the address in use; editing it is the change.
  useEffect(() => {
    setNewEmail(authState.email || "");
  }, [authState.email]);

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
    setNewEmail("");
    setDevices([]);
    setDevicesState("idle");
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
        console.warn(error);
        setOwnDecksError("account.errors.ownDecks");
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
      reportStatus(describeFailure(error, "account.errors.action"), "error");
    } finally {
      setPendingAction("");
    }
  }, [clearStatus, reportStatus]);

  const handleSignIn = useCallback(async () => {
    await runAction("sign-in", async () => {
      const nextAuthState = await authRepository.signInWithPassword({ email, password });
      setAuthState(nextAuthState);
      setPassword("");
      reportStatus({ key: "account.status.signedIn" }, "success");
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
        reportStatus({ key: "account.status.createdConfirm" }, "success");
        setActiveTab("sign-in");
        return;
      }

      reportStatus({ key: "account.status.created" }, "success");
    });
  }, [authRepository, displayName, email, password, reportStatus, runAction, setActiveTab]);

  const handlePasswordResetRequest = useCallback(async () => {
    await runAction("reset-password", async () => {
      await authRepository.sendPasswordResetEmail(resetEmail || email);
      reportStatus({ key: "account.status.resetSent" }, "success");
    });
  }, [authRepository, email, reportStatus, resetEmail, runAction]);

  const handleSocialSignIn = useCallback(async (provider) => {
    await runAction(`social-${provider}`, async () => {
      const result = await authRepository.signInWithProvider(provider);

      // The desktop app finishes sign-in in the browser and comes back
      // signed in; the web leaves for the provider's page instead.
      if (result?.completed) {
        setAuthState((currentState) => ({ ...currentState, ...result }));
        reportStatus({ key: "account.status.signedIn" }, "success");
        return;
      }

      reportStatus({ key: "account.status.redirecting", params: { provider: PROVIDER_NAMES[provider] || provider } }, "success");
    });
  }, [authRepository, reportStatus, runAction]);

  const handleResendVerification = useCallback(async () => {
    await runAction("resend-verification", async () => {
      await authRepository.resendVerification(authState.email || email);
      reportStatus({ key: "account.status.verificationSent" }, "success");
    });
  }, [authRepository, authState.email, email, reportStatus, runAction]);

  const handleSaveProfile = useCallback(async () => {
    await runAction("save-profile", async () => {
      const nextAuthState = await authRepository.updateProfile({ displayName });
      setAuthState((currentState) => ({
        ...currentState,
        ...nextAuthState,
      }));
      reportStatus({ key: "account.status.profileSaved" }, "success");
    });
  }, [authRepository, displayName, reportStatus, runAction]);

  const handleUpdatePassword = useCallback(async () => {
    const normalizedPassword = String(nextPassword || "");
    const normalizedConfirmPassword = String(confirmPassword || "");

    if (normalizedPassword.length < 10) {
      reportStatus({ key: "account.errors.passwordShort", params: { count: 10 } }, "error");
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      reportStatus({ key: "account.errors.passwordMismatch" }, "error");
      return;
    }

    await runAction("update-password", async () => {
      await authRepository.updatePassword(normalizedPassword);
      setNextPassword("");
      setConfirmPassword("");
      setIsRecoveryFlow(false);
      reportStatus({ key: "account.status.passwordSaved" }, "success");
    });
  }, [authRepository, confirmPassword, nextPassword, reportStatus, runAction]);

  const handleChangeEmail = useCallback(async () => {
    const nextEmail = toCleanString(newEmail).toLowerCase();

    if (!nextEmail) {
      reportStatus({ key: "account.authErrors.missing_email" }, "error");
      return;
    }

    if (nextEmail === toCleanString(authState.email).toLowerCase()) {
      reportStatus({ key: "account.errors.sameEmail" }, "error");
      return;
    }

    await runAction("change-email", async () => {
      const nextAuthState = await authRepository.updateEmail(nextEmail);
      setAuthState((currentState) => ({ ...currentState, ...nextAuthState }));
      setNewEmail(authState.email || "");
      reportStatus({ key: "account.status.emailChangeSent", params: { email: nextEmail } }, "success");
    });
  }, [authRepository, authState.email, newEmail, reportStatus, runAction]);

  // Changes made on this device and not yet sent go first, so signing out
  // never strands them; if the server does not answer in time they wait
  // here for the next sign-in.
  const flushPendingChanges = useCallback(async () => {
    const pending = Number(syncStatus.pendingDeckChanges || 0) + Number(syncStatus.pendingProgressChanges || 0);

    if (pending === 0 || !syncStatus.online || !syncRepository?.isConfigured?.()) {
      return;
    }

    await Promise.race([
      syncRepository.runNow({ reason: "sign-out" }).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, SIGN_OUT_SYNC_WAIT_MS)),
    ]);
  }, [syncRepository, syncStatus.online, syncStatus.pendingDeckChanges, syncStatus.pendingProgressChanges]);

  const leaveAccount = useCallback(() => {
    setAuthState(DEFAULT_AUTH_STATE);
    setSignedOutTab("sign-in");
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(ACCOUNT_TAB_QUERY_KEY);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handleSignOut = useCallback(async () => {
    await runAction("sign-out", async () => {
      await flushPendingChanges();
      await authRepository.signOut();
      leaveAccount();
      reportStatus({ key: "account.status.signedOut" }, "success");
    });
  }, [authRepository, flushPendingChanges, leaveAccount, reportStatus, runAction]);

  const handleSignOutEverywhere = useCallback(async () => {
    if (typeof window !== "undefined" && !window.confirm(t("account.sessions.confirm"))) {
      return;
    }

    await runAction("sign-out-everywhere", async () => {
      await flushPendingChanges();
      await authRepository.signOutEverywhere();
      leaveAccount();
      reportStatus({ key: "account.status.signedOutEverywhere" }, "success");
    });
  }, [authRepository, flushPendingChanges, leaveAccount, reportStatus, runAction, t]);

  const handleSyncNow = useCallback(async () => {
    await runAction("sync-now", async () => {
      await syncRepository.clearError?.();
      await syncRepository.runNow({ reason: "manual" });
    });
  }, [runAction, syncRepository]);

  const loadDevices = useCallback(async () => {
    if (typeof syncRepository?.listDevices !== "function") {
      setDevicesState("unavailable");
      return;
    }

    setDevicesState((current) => (current === "ready" ? "ready" : "loading"));

    try {
      setDevices(await syncRepository.listDevices());
      setDevicesState("ready");
    } catch (error) {
      console.warn(error);
      setDevicesState("error");
    }
  }, [syncRepository]);

  // Every device gone quiet for months, in one go; each is removed on its
  // own, so one failure leaves the rest done.
  const handleForgetDevices = useCallback(async (list) => {
    const targets = (Array.isArray(list) ? list : []).filter((device) => device?.deviceId && !device.isCurrent);

    if (targets.length === 0) {
      return;
    }

    setForgettingDeviceId("all");
    clearStatus();

    const results = await Promise.allSettled(targets.map((device) => syncRepository.forgetDevice(device.deviceId)));
    const removed = new Set(targets.filter((_, index) => results[index].status === "fulfilled").map((device) => device.deviceId));

    setDevices((current) => current.filter((item) => !removed.has(item.deviceId)));
    setForgettingDeviceId("");

    if (removed.size === targets.length) {
      reportStatus({ key: "account.status.devicesForgotten", params: { count: removed.size } }, "success");
    } else {
      reportStatus({ key: "account.errors.action" }, "error");
    }
  }, [clearStatus, reportStatus, syncRepository]);

  const handleForgetDevice = useCallback(async (device) => {
    if (!device?.deviceId || device.isCurrent) {
      return;
    }

    setForgettingDeviceId(device.deviceId);
    clearStatus();

    try {
      await syncRepository.forgetDevice(device.deviceId);
      setDevices((current) => current.filter((item) => item.deviceId !== device.deviceId));
      reportStatus({ key: "account.status.deviceForgotten", params: { name: device.deviceName || t("account.devices.unnamed") } }, "success");
    } catch (error) {
      reportStatus(describeFailure(error, "account.errors.action"), "error");
    } finally {
      setForgettingDeviceId("");
    }
  }, [clearStatus, reportStatus, syncRepository, t]);

  const handleDeleteHubDeck = useCallback(async (deck) => {
    const deckId = toCleanString(deck?.id);

    if (!deckId) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(t("account.hub.confirmDelete", { name: deck?.title || t("deleteDeck.thisDeck") }));

      if (!confirmed) {
        return;
      }
    }

    setDeletingHubDeckId(deckId);
    clearStatus();

    try {
      await hubRepository.deleteDeck(deckId);
      setOwnDecks((currentDecks) => currentDecks.filter((item) => String(item?.id) !== deckId));
      reportStatus({ key: "account.status.hubDeckDeleted" }, "danger");
    } catch (error) {
      reportStatus(describeFailure(error, "account.errors.hubDelete"), "error");
    } finally {
      setDeletingHubDeckId("");
    }
  }, [clearStatus, hubRepository, reportStatus, t]);

  const handleCopyDeckLink = useCallback(async (deck) => {
    const publicUrl = buildPublicDeckShareUrl(deck?.slug, {
      envBaseUrl: import.meta.env?.VITE_PUBLIC_APP_URL,
      origin: typeof window !== "undefined" ? window.location?.origin : "",
      previewKey: buildDeckSharePreviewKey(deck),
    });

    if (!publicUrl) {
      reportStatus({ key: "browse.errors.noLink" }, "error");
      return;
    }

    const copied = await copyTextToClipboard(publicUrl);
    reportStatus(
      { key: copied ? "browse.status.linkCopied" : "browse.errors.copy" },
      copied ? "success" : "error",
    );
  }, [reportStatus]);

  const isBusy = Boolean(pendingAction);
  const statusAlert = useMemo(
    () => ({ text: status ? t(status.key, status.params) : "", variant: statusVariant, onClose: clearStatus }),
    [clearStatus, status, statusVariant, t],
  );
  const signedOutTabs = useMemo(
    () => SIGNED_OUT_TAB_ITEMS.map((item) => ({ ...item, label: t(`account.tabs.${item.key}`) })),
    [t],
  );
  const isSyncConfigured = Boolean(syncRepository?.isConfigured?.());
  const signedInTabs = useMemo(
    () =>
      SIGNED_IN_TAB_ITEMS.filter((item) => item.key !== "devices" || isSyncConfigured).map((item) => ({
        ...item,
        label: t(`account.tabs.${item.key}`),
      })),
    [isSyncConfigured, t],
  );

  // The device list is read when its tab opens, and again after each sync,
  // which is when this device's "last seen" moves.
  const isDevicesTabOpen = authState.isAuthenticated && signedInTab === "devices";
  // "Active 5 minutes ago" moves on while the list is open.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isDevicesTabOpen) {
      return undefined;
    }

    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [isDevicesTabOpen]);

  const deviceGroups = useMemo(() => groupDevices(devices, nowMs), [devices, nowMs]);
  const pendingChanges =
    Number(syncStatus.pendingDeckChanges || 0) + Number(syncStatus.pendingProgressChanges || 0);

  useEffect(() => {
    if (isDevicesTabOpen) {
      void loadDevices();
    }
  }, [isDevicesTabOpen, loadDevices, syncStatus.lastSuccessfulSyncAt]);

  // Only the providers the project has switched on in Supabase: a button
  // that leads to "provider is not enabled" is worse than no button.
  const [enabledProviders, setEnabledProviders] = useState([]);

  useEffect(() => {
    if (!isConfigured || typeof authRepository.getSocialProviders !== "function") {
      return undefined;
    }

    let isCurrent = true;
    authRepository
      .getSocialProviders(SOCIAL_PROVIDERS.map((item) => item.key))
      .then((providers) => {
        if (isCurrent) setEnabledProviders(Array.isArray(providers) ? providers : []);
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [authRepository, isConfigured]);

  const socialProviders = useMemo(
    () =>
      SOCIAL_PROVIDERS.filter((item) => enabledProviders.includes(item.key)).map((item) => ({
        ...item,
        label: t("account.continueWith", { provider: PROVIDER_NAMES[item.key] }),
      })),
    [enabledProviders, t],
  );
  const syncState = useMemo(() => {
    if (!syncStatus.configured) {
      return { state: "unavailable" };
    }

    if (!authState.isAuthenticated) {
      return { state: "guest" };
    }

    if (!syncStatus.online) {
      return { state: "offline" };
    }

    if (syncStatus.lastErrorMessage) {
      return { state: "attention" };
    }

    // Background passes every few seconds are not shown: "Syncing" only
    // until the first sync has finished, so the status does not flicker.
    if (syncStatus.syncing && !syncStatus.lastSuccessfulSyncAt) {
      return { state: "syncing" };
    }

    if (syncStatus.lastSuccessfulSyncAt) {
      return { state: "synced" };
    }

    return { state: "ready" };
  }, [
    authState.isAuthenticated,
    syncStatus.configured,
    syncStatus.lastErrorMessage,
    syncStatus.lastSuccessfulSyncAt,
    syncStatus.online,
    syncStatus.syncing,
  ]);

  const syncOverview = useMemo(
    () => ({
      state: syncState.state,
      label: t(`account.sync.${syncState.state}.label`),
      text: t(`account.sync.${syncState.state}.text`),
    }),
    [syncState.state, t],
  );

  const signInMethodLabel =
    PROVIDER_NAMES[authState.provider] || (authState.provider === "email" ? t("account.emailPassword") : authState.provider);
  // Offline there is nothing to reach, and mid-sync the button would only
  // queue a second pass.
  const canSyncNow = ["synced", "ready", "attention"].includes(syncState.state);

  return {
    isConfigured,
    isDesktopMode,
    isAuthLoading,
    authState,
    activeTab: authState.isAuthenticated ? signedInTab : signedOutTab,
    isSectionRequested,
    showMenu: () =>
      setSearchParamsRef.current((current) => {
        const next = new URLSearchParams(current);
        next.delete(ACCOUNT_TAB_QUERY_KEY);
        return next;
      }),
    isBusy,
    pendingAction,
    statusAlert,
    signedOutTabs,
    signedInTabs,
    socialProviders,
    syncStatus,
    syncOverview,
    email,
    password,
    displayName,
    resetEmail,
    newEmail,
    setNewEmail,
    devices,
    deviceGroups,
    nowMs,
    pendingChanges,
    handleForgetDevices,
    devicesState,
    forgettingDeviceId,
    canSyncNow,
    signInMethodLabel,
    handleChangeEmail,
    handleSignOutEverywhere,
    handleSyncNow,
    handleForgetDevice,
    loadDevices,
    nextPassword,
    confirmPassword,
    isRecoveryFlow,
    ownDecks,
    isOwnDecksLoading,
    ownDecksError: ownDecksError ? t(ownDecksError) : "",
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
