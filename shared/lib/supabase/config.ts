type SupabaseConfig = {
  publishableKey: string;
  url: string;
};

function requireEnvironmentValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseServerConfig(): SupabaseConfig {
  return {
    url: requireEnvironmentValue(
      "SUPABASE_URL",
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: requireEnvironmentValue(
      "SUPABASE_PUBLISHABLE_KEY",
      process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

export function getSupabaseBrowserConfig(): SupabaseConfig {
  return {
    url: requireEnvironmentValue(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: requireEnvironmentValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}
