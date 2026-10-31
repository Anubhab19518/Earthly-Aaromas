type SupabaseConfig = {
  publishableKey: string;
  url: string;
};

type ResendConfig = {
  apiKey: string | undefined;
  fromEmail: string;
};

type AppConfig = {
  appUrl: string;
  isProduction: boolean;
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

export function getSupabaseAdminConfig(): { url: string; serviceRoleKey: string } {
  return {
    url: requireEnvironmentValue(
      "SUPABASE_URL",
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    serviceRoleKey: requireEnvironmentValue(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
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

export function getResendConfig(): ResendConfig {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || "Earthly Aaromas <onboarding@resend.dev>",
  };
}

export function getAppConfig(): AppConfig {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    isProduction: process.env.NODE_ENV === "production",
  };
}
