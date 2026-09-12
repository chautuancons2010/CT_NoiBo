import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getClientEnv, isSupabaseConfigured } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const env = getClientEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublicKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured(env) || !supabaseUrl || !supabasePublicKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabasePublicKey);
  }

  return browserClient;
}
