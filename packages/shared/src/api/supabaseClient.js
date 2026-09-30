import { createClient } from "@supabase/supabase-js";
import { supabaseAuthLock } from "./supabaseAuthLock";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

let cachedSupabaseClient = null;

const getElectronApi = () =>
  typeof window !== "undefined" ? window.electronAPI : undefined;

const hasDesktopAuthStorageBridge = () => {
  const electronApi = getElectronApi();

  return Boolean(
    electronApi &&
      typeof electronApi.authStorageGetItem === "function" &&
      typeof electronApi.authStorageSetItem === "function" &&
      typeof electronApi.authStorageRemoveItem === "function",
  );
};

const createDesktopAuthStorage = () => {
  if (!hasDesktopAuthStorageBridge()) {
    return undefined;
  }

  const electronApi = getElectronApi();

  return {
    async getItem(key) {
      return electronApi.authStorageGetItem(key);
    },
    async setItem(key, value) {
      await electronApi.authStorageSetItem({ key, value });
    },
    async removeItem(key) {
      await electronApi.authStorageRemoveItem(key);
    },
  };
};

// Which social providers the project has switched on, from Supabase's
// public auth settings; empty when they cannot be read.
export const fetchEnabledSocialProviders = async (candidates = []) => {
  if (!hasSupabaseConfig() || typeof fetch !== "function") {
    return [];
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
    });

    if (!response.ok) {
      return [];
    }

    const settings = await response.json();
    return candidates.filter((provider) => settings?.external?.[provider] === true);
  } catch {
    return [];
  }
};

export const hasSupabaseConfig = () => {
  return Boolean(supabaseUrl && supabasePublishableKey);
};

export const getSupabaseClient = () => {
  if (!hasSupabaseConfig()) {
    return null;
  }

  if (cachedSupabaseClient) {
    return cachedSupabaseClient;
  }

  cachedSupabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: createDesktopAuthStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: supabaseAuthLock,
      // The desktop app signs in with Google and GitHub through the system
      // browser and a loopback address, which only a PKCE code can cross.
      // The web keeps the default flow, so email links work on any device.
      ...(hasDesktopAuthStorageBridge() ? { flowType: "pkce" } : {}),
    },
  });

  return cachedSupabaseClient;
};

export const getCurrentSupabaseAuthUser = async () => {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser();

  if (error) {
    throw new Error(error.message || "Failed to resolve current Supabase user");
  }

  return data?.user || null;
};
