import { redirect } from "next/navigation";

import { OrganizationOnboardingForm } from "@/modules/auth/components/organization-onboarding-form";
import { createClient } from "@/shared/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1);

  if (memberships?.length) {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold tracking-wide text-zinc-500">FIRST-TIME SETUP</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your organization</h1>
      <p className="mt-2 text-sm text-zinc-600">You will be assigned the Owner role automatically.</p>
      <div className="mt-8"><OrganizationOnboardingForm /></div>
    </section>
  );
}
