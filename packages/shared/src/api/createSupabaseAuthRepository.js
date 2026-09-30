import { fetchEnabledSocialProviders, hasSupabaseConfig, getSupabaseClient } from "./supabaseClient";

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const EMPTY_AUTH_SUMMARY = Object.freeze({
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

const isDesktopRuntime = () => {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") {
    return false;
  }

  return navigator.userAgent.includes("Electron");
};

const resolveEmailRedirectTo = () => {
  if (typeof window === "undefined" || !window.location?.origin) {
    return undefined;
  }

  return `${window.location.origin}/app/account`;
};

const resolveVerificationState = (user) => {
  return Boolean(
    user?.email_confirmed_at ||
      user?.confirmed_at ||
      user?.confirmedAt ||
      user?.identities?.some((identity) => identity?.provider !== "email"),
  );
};

const linkedProviders = (user) => {
  const fromMetadata = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : [];
  const fromIdentities = Array.isArray(user?.identities) ? user.identities.map((identity) => identity?.provider) : [];
  const single = user?.app_metadata?.provider ? [user.app_metadata.provider] : [];

  return [...new Set([...fromMetadata, ...fromIdentities, ...single].map(toCleanString).filter(Boolean))];
};

const toAuthSummary = (session) => {
  const user = session?.user || null;
  const metadata =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? user.user_metadata
      : {};
  const appMetadata =
    user?.app_metadata && typeof user.app_metadata === "object"
      ? user.app_metadata
      : {};

  return {
    session: session || null,
    user,
    isAuthenticated: Boolean(user?.id),
    isAnonymous: Boolean(user?.is_anonymous || appMetadata.provider === "anonymous"),
    isEmailVerified: resolveVerificationState(user),
    email: toCleanString(user?.email),
    displayName:
      toCleanString(metadata.display_name) ||
      toCleanString(metadata.full_name) ||
      toCleanString(user?.email),
    provider:
      toCleanString(appMetadata.provider) ||
      toCleanString(user?.identities?.[0]?.provider) ||
      "email",
    // A new address waiting for its confirmation link.
    pendingEmail: toCleanString(user?.new_email),
    // Signed up with a password, or added one later; a Google or GitHub
    // account has neither until it sets one.
    hasPassword: linkedProviders(user).includes("email"),
    linkedProviders: linkedProviders(user),
  };
};

const ensureClient = () => {
  if (!hasSupabaseConfig()) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to .env.",
    );
  }

  const client = getSupabaseClient();

  if (!client) {
    throw new Error("Failed to initialize Supabase auth client");
  }

  return client;
};

const resolveSessionWithUpdatedUser = async (client, user) => {
  const { data: sessionData } = await client.auth.getSession();
  const session = sessionData?.session || null;

  if (!user) {
    return toAuthSummary(session);
  }

  return toAuthSummary(
    session
      ? {
          ...session,
          user,
        }
      : { user },
  );
};

// Supabase's error code is kept on the error, so the interface can say
// what went wrong in its own language ("invalid_credentials", ...).
const authFailure = (error, fallbackMessage) =>
  Object.assign(new Error(error?.message || fallbackMessage), { code: String(error?.code || "") });

const DESKTOP_OAUTH_ERRORS = {
  social_port_busy: "social_port_busy",
  timeout: "social_timeout",
  cancelled: "social_cancelled",
};

// The desktop app: a one-time address on this computer, the provider in
// the system browser, and the code it brings back exchanged here with the
// PKCE secret this app kept. Resolves signed in, or throws a coded error.
const signInWithProviderOnDesktop = async (client, provider) => {
  const electronApi = typeof window !== "undefined" ? window.electronAPI : undefined;

  if (typeof electronApi?.oauthPrepare !== "function") {
    throw authFailure({ code: "social_desktop_unavailable" }, "Social sign-in is unavailable in this build");
  }

  const prepared = await electronApi.oauthPrepare();

  if (prepared?.error || !prepared?.redirectTo) {
    throw authFailure({ code: DESKTOP_OAUTH_ERRORS[prepared?.error] || "social_failed" }, "Could not start social sign-in");
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: prepared.redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    await electronApi.oauthCancel?.();
    throw authFailure(error || {}, "Failed to start social sign-in");
  }

  const result = await electronApi.oauthAwaitCode(data.url);

  if (!result?.code) {
    throw authFailure({ code: DESKTOP_OAUTH_ERRORS[result?.error] || "social_failed" }, result?.error || "Social sign-in did not finish");
  }

  const exchanged = await client.auth.exchangeCodeForSession(result.code);

  if (exchanged.error) {
    throw authFailure(exchanged.error, "Failed to complete sign-in");
  }

  return { ...toAuthSummary(exchanged.data?.session || null), completed: true };
};

export const createSupabaseAuthRepository = () => {
  return {
    // Google and GitHub, when the project has switched them on.
    async getSocialProviders(candidates = ["google", "github"]) {
      return fetchEnabledSocialProviders(candidates);
    },
    isConfigured() {
      return hasSupabaseConfig();
    },
    async getSnapshot() {
      const client = ensureClient();
      const { data, error } = await client.auth.getSession();

      if (error) {
        throw authFailure(error, "Failed to resolve account session");
      }

      return toAuthSummary(data?.session || null);
    },
    subscribe(callback) {
      if (typeof callback !== "function") {
        return () => {};
      }

      if (!hasSupabaseConfig()) {
        callback(EMPTY_AUTH_SUMMARY);
        return () => {};
      }

      const client = ensureClient();
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_, session) => {
        callback(toAuthSummary(session));
      });

      return () => {
        subscription?.unsubscribe?.();
      };
    },
    async signInWithPassword({ email, password }) {
      const client = ensureClient();
      const normalizedEmail = toCleanString(email).toLowerCase();
      const normalizedPassword = String(password || "");

      if (!normalizedEmail || !normalizedPassword) {
        throw authFailure({ code: "missing_credentials" }, "Email and password are required");
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        throw authFailure(error, "Failed to sign in");
      }

      return toAuthSummary(data?.session || null);
    },
    async signUpWithPassword({ email, password, displayName }) {
      const client = ensureClient();
      const normalizedEmail = toCleanString(email).toLowerCase();
      const normalizedPassword = String(password || "");
      const normalizedDisplayName = toCleanString(displayName);

      if (!normalizedEmail || !normalizedPassword) {
        throw authFailure({ code: "missing_credentials" }, "Email and password are required");
      }

      const { data, error } = await client.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          emailRedirectTo: resolveEmailRedirectTo(),
          data: normalizedDisplayName
            ? { display_name: normalizedDisplayName }
            : undefined,
        },
      });

      if (error) {
        throw authFailure(error, "Failed to create account");
      }

      return {
        ...toAuthSummary(data?.session || null),
        pendingEmailConfirmation: !data?.session,
      };
    },
    async signInWithProvider(provider) {
      const client = ensureClient();
      const normalizedProvider = toCleanString(provider).toLowerCase();

      if (!normalizedProvider) {
        throw new Error("Auth provider is required");
      }

      if (isDesktopRuntime()) {
        return signInWithProviderOnDesktop(client, normalizedProvider);
      }

      const { data, error } = await client.auth.signInWithOAuth({
        provider: normalizedProvider,
        options: {
          redirectTo: resolveEmailRedirectTo(),
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        throw authFailure(error, "Failed to start social sign-in");
      }

      return data || null;
    },
    async exchangeCodeForSession(code) {
      const client = ensureClient();
      const normalizedCode = toCleanString(code);

      if (!normalizedCode) {
        throw new Error("Auth code is missing");
      }

      const { data, error } = await client.auth.exchangeCodeForSession(normalizedCode);

      if (error) {
        throw authFailure(error, "Failed to complete sign-in");
      }

      return toAuthSummary(data?.session || null);
    },
    async setSessionFromTokens({ accessToken, refreshToken }) {
      const client = ensureClient();
      const normalizedAccessToken = toCleanString(accessToken);
      const normalizedRefreshToken = toCleanString(refreshToken);

      if (!normalizedAccessToken || !normalizedRefreshToken) {
        throw new Error("Recovery session is incomplete");
      }

      const { data, error } = await client.auth.setSession({
        access_token: normalizedAccessToken,
        refresh_token: normalizedRefreshToken,
      });

      if (error) {
        throw authFailure(error, "Failed to restore account session");
      }

      return toAuthSummary(data?.session || null);
    },
    async resendVerification(email) {
      const client = ensureClient();
      const normalizedEmail = toCleanString(email).toLowerCase();

      if (!normalizedEmail) {
        throw authFailure({ code: "missing_email" }, "Email is required");
      }

      const { error } = await client.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: resolveEmailRedirectTo(),
        },
      });

      if (error) {
        throw authFailure(error, "Failed to resend verification email");
      }

      return { ok: true };
    },
    async sendPasswordResetEmail(email) {
      const client = ensureClient();
      const normalizedEmail = toCleanString(email).toLowerCase();

      if (!normalizedEmail) {
        throw authFailure({ code: "missing_email" }, "Email is required");
      }

      const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: resolveEmailRedirectTo(),
      });

      if (error) {
        throw authFailure(error, "Failed to send password reset email");
      }

      return { ok: true };
    },
    async updateProfile({ displayName }) {
      const client = ensureClient();
      const normalizedDisplayName = toCleanString(displayName);

      const { data, error } = await client.auth.updateUser({
        data: {
          display_name: normalizedDisplayName,
        },
      });

      if (error) {
        throw authFailure(error, "Failed to update profile");
      }

      return resolveSessionWithUpdatedUser(client, data?.user || null);
    },
    async updatePassword(password) {
      const client = ensureClient();
      const normalizedPassword = String(password || "");

      if (!normalizedPassword) {
        throw authFailure({ code: "missing_password" }, "Password is required");
      }

      const { data, error } = await client.auth.updateUser({
        password: normalizedPassword,
      });

      if (error) {
        throw authFailure(error, "Failed to update password");
      }

      return resolveSessionWithUpdatedUser(client, data?.user || null);
    },
    // Supabase sends a link to the new address (and, with "secure email
    // change", to the old one too); the address changes once it is opened.
    async updateEmail(email) {
      const client = ensureClient();
      const normalizedEmail = toCleanString(email).toLowerCase();

      if (!normalizedEmail) {
        throw authFailure({ code: "missing_email" }, "Email is required");
      }

      const { data, error } = await client.auth.updateUser(
        { email: normalizedEmail },
        { emailRedirectTo: resolveEmailRedirectTo() },
      );

      if (error) {
        throw authFailure(error, "Failed to change email");
      }

      return resolveSessionWithUpdatedUser(client, data?.user || null);
    },
    // Every session of this account ends, this one included.
    async signOutEverywhere() {
      const client = ensureClient();
      const { error } = await client.auth.signOut({ scope: "global" });

      if (error) {
        throw authFailure(error, "Failed to sign out everywhere");
      }

      return EMPTY_AUTH_SUMMARY;
    },
    async signOut() {
      const client = ensureClient();
      const { error } = await client.auth.signOut();

      if (error) {
        throw authFailure(error, "Failed to sign out");
      }

      return EMPTY_AUTH_SUMMARY;
    },
  };
};
