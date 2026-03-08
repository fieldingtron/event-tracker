import { createBrowserClient as createClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

export function createBrowserClient() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured — realtime disabled");
  return createClient(url, key);
}
