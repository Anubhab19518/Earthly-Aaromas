"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseBrowserConfig } from "@/shared/lib/supabase/config";

export function createClient() {
  const { publishableKey, url } = getSupabaseBrowserConfig();
  return createBrowserClient(url, publishableKey);
}
