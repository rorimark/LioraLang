import { createClient } from "@supabase/supabase-js";

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
    },
  });

  return cachedSupabaseClient;
};
