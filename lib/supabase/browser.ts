import { createBrowserClient as createClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

export function createBrowserClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
