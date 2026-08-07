import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { InventoryDashboard } from "@/modules/inventory/components/inventory-dashboard";

import { cookies } from "next/headers";

export default async function InventoryPage() {
  const supabase = await createClient();

  // Get active membership and check permission
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const { data: canView } = await supabase.rpc("has_permission", {
    required_permission_code: "inventory.view",
    target_organization_id: membership.organization_id,
  });

  const { data: canManageMaster } = await supabase.rpc("has_permission", {
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  // Since we haven't strictly defined inventory.view vs manage everywhere yet,
  // we'll allow either for now to view the dashboard.
  if (!canView && !canManageMaster) redirect("/dashboard");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  let snapshotsQuery = supabase
    .from("inventory_snapshot")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("last_movement_at", { ascending: false });
    
  if (activeBranchId) {
    snapshotsQuery = snapshotsQuery.eq("location_id", activeBranchId);
  }

  const [
    { data: snapshots },
    { data: ingredients },
    { data: categories },
    { data: locations },
    { data: units },
    { data: alertPolicies }
  ] = await Promise.all([
    snapshotsQuery,
    supabase
      .from("ingredients")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null),
    supabase
      .from("ingredient_categories")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null),
    supabase
      .from("locations")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("units")
      .select("*")
      .is("deleted_at", null),
    supabase
      .from("inventory_alert_policies")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null),
  ]);

  return (
    <section>
      <InventoryDashboard
        snapshots={snapshots || []}
        ingredients={ingredients || []}
        categories={categories || []}
        locations={locations || []}
        units={units || []}
        alertPolicies={alertPolicies || []}
      />
    </section>
  );
}
