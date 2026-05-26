import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";

export const UPLOAD_BUCKET = "uploads";

declare global {
  var supabaseBrowser: SupabaseClient | undefined;
  var supabaseAdmin: SupabaseClient | undefined;
}

/**
 * Returns the browser Supabase client or `null` if required env vars are missing.
 * This prevents the app from crashing on pages that don't need realtime
 * when NEXT_PUBLIC_SUPABASE_* env vars are not configured.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    if (typeof window !== "undefined") {
      console.warn(
        "[supabase] Realtime disabled — missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      );
    }
    return null;
  }
  if (!globalThis.supabaseBrowser) {
    globalThis.supabaseBrowser = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return globalThis.supabaseBrowser;
}

/**
 * Returns the admin (service-role) Supabase client or `null` if env vars are missing.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.warn("[supabase] Admin client unavailable — missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    return null;
  }
  if (!globalThis.supabaseAdmin) {
    globalThis.supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return globalThis.supabaseAdmin;
}
