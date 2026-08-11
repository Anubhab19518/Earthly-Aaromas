import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/shared/lib/supabase/server";
import { Sidebar } from "@/shared/components/layout/sidebar";
import { TopNav } from "@/shared/components/layout/top-nav";

export default async function ErpLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect("/login");
  }

  // Step 1: Determine role from the tc_role cookie (set during signIn, no DB call needed)
  const cookieStore = await cookies();
  const roleCode = cookieStore.get("tc_role")?.value;
  const isOwner = roleCode === "OWNER";

  if (!roleCode) {
    // No role cookie — user must re-authenticate to restore routing state
    redirect("/login");
  }

  // Step 2: Enforce MFA for Owners BEFORE querying RLS-protected tables.
  // organization_memberships RLS requires aal2 (has_mfa_assurance()).
  // Checking MFA first ensures the subsequent DB query will actually return data.
  if (isOwner) {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== "aal2") {
      redirect(assurance?.nextLevel === "aal2" ? "/mfa/verify" : "/mfa/enroll");
    }
  }

  // Step 3: Now at aal2 (or is an employee — employees bypass MFA in this layout).
  // The RLS membership query will succeed here.
  const { data: membershipData } = await supabase
    .from("organization_memberships")
    .select(`
      organization_id,
      membership_roles (
        roles ( code )
      )
    `)
    .eq("user_id", userData.user.id)
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membershipData) {
    redirect("/onboarding");
  }

  // Fetch user profile for TopNav
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userData.user.id)
    .single();

  // Fetch locations for Branch Switcher
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", membershipData.organization_id)
    .is("deleted_at", null)
    .order("name");

  const activeBranchId = cookieStore.get("active_branch_id")?.value || locations?.[0]?.id || "";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopNav locations={locations || []} userFullName={profile?.full_name || ""} initialBranchId={activeBranchId} />
        <main className="flex-1 overflow-y-auto p-5">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
