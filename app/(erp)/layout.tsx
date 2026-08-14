import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/shared/lib/supabase/server";
import { Sidebar } from "@/shared/components/layout/sidebar";
import { TopNav } from "@/shared/components/layout/top-nav";
import { BranchProvider } from "@/shared/providers/branch-context";
import { getActiveInventoryAlerts } from "@/modules/inventory/services/alert-policy.actions";

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
  if (isOwner) {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== "aal2") {
      redirect(assurance?.nextLevel === "aal2" ? "/mfa/verify" : "/mfa/enroll");
    }
  }

  // Step 3: Now at aal2 (or is an employee — employees bypass MFA in this layout).
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

  // Fetch locations for Branch Switcher & Header Context
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, location_types(code)")
    .eq("organization_id", membershipData.organization_id)
    .is("deleted_at", null)
    .order("name");

  const formattedLocations = (locations || []).map((l: any) => ({
    id: l.id,
    name: l.name,
    type: l.location_types?.code || "SHOP",
  }));

  const activeBranchId = cookieStore.get("active_branch_id")?.value || formattedLocations?.[0]?.id || "";

  // Fetch active alerts for the current branch
  const activeAlerts = await getActiveInventoryAlerts(activeBranchId);

  return (
    <BranchProvider activeBranchId={activeBranchId} locations={formattedLocations}>
      <div className="flex h-screen overflow-hidden font-sans text-slate-900 bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TopNav locations={locations || []} userFullName={profile?.full_name || ""} initialBranchId={activeBranchId} alerts={activeAlerts} />
          <main className="flex-1 overflow-y-auto p-5">
            <div className="w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
