import { redirect } from "next/navigation";
import { MfaVerifyForm } from "@/modules/auth/components/mfa-forms";
import { createClient } from "@/shared/lib/supabase/server";
import { getSupabaseServerConfig } from "@/shared/lib/supabase/config";

export default async function MfaVerifyPage() {
  const supabase = await createClient(); const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel === "aal2") redirect("/dashboard");
  if (data?.nextLevel !== "aal2") redirect("/mfa/enroll");
  return (
    <section className="w-full max-w-sm flex flex-col items-center bg-transparent p-6">
      <div className="flex items-center justify-center gap-2 text-[#8b5cf6] mb-8">
        <span className="text-xl font-semibold tracking-tight text-slate-800">Earthly Aaromas</span>
      </div>
      <h1 className="text-[22px] font-bold tracking-tight text-slate-900 text-center">Verify your sign in</h1>
      <p className="mt-1.5 text-[13px] font-medium text-slate-500 mb-8 text-center">Enter the code from your authenticator app</p>
      <div className="w-full">
        <MfaVerifyForm {...getSupabaseServerConfig()} />
      </div>
    </section>
  );
}
