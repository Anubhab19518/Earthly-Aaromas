import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { PurchaseOrderListTable } from "@/modules/purchasing/components/purchase-order-list-table";
import { cookies } from "next/headers";

export default async function PurchaseOrdersPage() {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "inventory.manage",
    target_organization_id: membership.organization_id,
  });

  if (!canManage) redirect("/dashboard");

  let posQuery = supabase
    .from("purchase_orders")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  const [{ data: pos }, { data: suppliers }, { data: locations }] = await Promise.all([
    posQuery,
    supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("locations")
      .select("*, location_types(code)")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value || locations?.[0]?.id || "";

  const filteredPos = activeBranchId
    ? pos?.filter((p) => p.location_id === activeBranchId)
    : pos;



  let canCreate = false;
  if (activeBranchId) {
    const activeLocation = locations?.find(l => l.id === activeBranchId);
    if (activeLocation?.location_types?.code === "WAREHOUSE") {
      canCreate = true;
    }
  } else {
    // If no active branch is selected (shouldn't happen), assume false.
    // In some setups "All Locations" might be possible, but standard is restricted.
    canCreate = false;
  }

  return (
    <section>
      <PurchaseOrderListTable
        purchaseOrders={filteredPos || []}
        suppliers={suppliers || []}
        locations={locations || []}
        canCreate={canCreate}
      />
    </section>
  );
}
