import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Creates one Supabase client in the browser.
 * This module is safe to import during TanStack Start server rendering because
 * it does not access browser storage until this function is called.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Supabase browser authentication is only available in the browser.");
  }

  if (browserClient) return browserClient;

  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
  const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in apps/business-portal/.env.",
    );
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
