import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { getFinancialOverview } from "@/modules/analytics/services/financial-overview.actions";
import { FinancialOverviewClient } from "@/modules/analytics/components/financial-overview-client";

export default async function FinancialOverviewPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  // Require owner level permissions
  const { data: isOwner } = await supabase.rpc("has_permission", {
    required_permission_code: "master_data.manage", 
    target_organization_id: membership.organization_id,
  });

  if (!isOwner) redirect("/dashboard");

  const orgId = membership.organization_id;
  const overview = await getFinancialOverview(orgId);

  return <FinancialOverviewClient overview={overview} />;
}

