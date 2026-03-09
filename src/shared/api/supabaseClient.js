import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

let cachedSupabaseClient = null;

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
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return cachedSupabaseClient;
};
