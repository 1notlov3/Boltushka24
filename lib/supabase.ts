import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/public-env";
import { serverEnv } from "@/lib/server-env";

const SUPABASE_URL = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SECRET_KEY = serverEnv.SUPABASE_SECRET_KEY;

export const UPLOAD_BUCKET = "uploads";

declare global {
  var supabaseBrowser: SupabaseClient | undefined;
  var supabaseAdmin: SupabaseClient | undefined;
}

export function getSupabaseBrowser(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!globalThis.supabaseBrowser) {
    globalThis.supabaseBrowser = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return globalThis.supabaseBrowser;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  if (!globalThis.supabaseAdmin) {
    globalThis.supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return globalThis.supabaseAdmin;
}
