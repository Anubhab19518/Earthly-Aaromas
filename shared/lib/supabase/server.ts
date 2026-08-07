import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseServerConfig } from "@/shared/lib/supabase/config";

export async function createClient() {
  const cookieStore = await cookies();
  const { publishableKey, url } = getSupabaseServerConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes sessions.
        }
      },
    },
  });
}
