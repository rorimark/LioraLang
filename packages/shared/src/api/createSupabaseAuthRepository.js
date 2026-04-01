import { hasSupabaseConfig, getSupabaseClient } from "./supabaseClient";

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

export const createSupabaseAuthRepository = () => {
  return {
    isConfigured() {
      return hasSupabaseConfig();
    },
    async getSnapshot() {
      const client = ensureClient();
      const { data, error } = await client.auth.getSession();

      if (error) {
        throw new Error(error.message || "Failed to resolve account session");
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
        throw new Error("Email and password are required");
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        throw new Error(error.message || "Failed to sign in");
      }

      return toAuthSummary(data?.session || null);
    },
    async signUpWithPassword({ email, password, displayName }) {
      const client = ensureClient();
      const normalizedEmail = toCleanString(email).toLowerCase();
      const normalizedPassword = String(password || "");
      const normalizedDisplayName = toCleanString(displayName);

      if (!normalizedEmail || !normalizedPassword) {
        throw new Error("Email and password are required");
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
        throw new Error(error.message || "Failed to create account");
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
        throw new Error("Social sign-in will be added for desktop next. Use email and password for now.");
      }

      const { data, error } = await client.auth.signInWithOAuth({
        provider: normalizedProvider,
        options: {
          redirectTo: resolveEmailRedirectTo(),
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to start social sign-in");
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
        throw new Error(error.message || "Failed to complete sign-in");
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
        throw new Error(error.message || "Failed to restore account session");
      }

      return toAuthSummary(data?.session || null);
    },
    async resendVerification(email) {
      const client = ensureClient();
      const normalizedEmail = toCleanString(email).toLowerCase();

      if (!normalizedEmail) {
        throw new Error("Email is required");
      }

      const { error } = await client.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: resolveEmailRedirectTo(),
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to resend verification email");
      }

      return { ok: true };
    },
    async sendPasswordResetEmail(email) {
      const client = ensureClient();
      const normalizedEmail = toCleanString(email).toLowerCase();

      if (!normalizedEmail) {
        throw new Error("Email is required");
      }

      const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: resolveEmailRedirectTo(),
      });

      if (error) {
        throw new Error(error.message || "Failed to send password reset email");
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
        throw new Error(error.message || "Failed to update profile");
      }

      return resolveSessionWithUpdatedUser(client, data?.user || null);
    },
    async updatePassword(password) {
      const client = ensureClient();
      const normalizedPassword = String(password || "");

      if (!normalizedPassword) {
        throw new Error("Password is required");
      }

      const { data, error } = await client.auth.updateUser({
        password: normalizedPassword,
      });

      if (error) {
        throw new Error(error.message || "Failed to update password");
      }

      return resolveSessionWithUpdatedUser(client, data?.user || null);
    },
    async signOut() {
      const client = ensureClient();
      const { error } = await client.auth.signOut();

      if (error) {
        throw new Error(error.message || "Failed to sign out");
      }

      return EMPTY_AUTH_SUMMARY;
    },
  };
};
