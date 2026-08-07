import { redirect } from "next/navigation";
import { MfaVerifyForm } from "@/modules/auth/components/mfa-forms";
import { createClient } from "@/shared/lib/supabase/server";
import { getSupabaseServerConfig } from "@/shared/lib/supabase/config";

export default async function MfaVerifyPage() {
  const supabase = await createClient(); const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel === "aal2") redirect("/dashboard");
  if (data?.nextLevel !== "aal2") redirect("/mfa/enroll");
  return <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"><p className="text-sm font-semibold tracking-wide text-zinc-500">TWO-FACTOR AUTHENTICATION</p><h1 className="mt-2 text-2xl font-semibold">Verify your sign in</h1><div className="mt-6"><MfaVerifyForm {...getSupabaseServerConfig()} /></div></section>;
}
