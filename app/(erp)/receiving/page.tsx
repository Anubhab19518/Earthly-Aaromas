import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { GrnListTable } from "@/modules/receiving/components/grn-list-table";

import { cookies } from "next/headers";

export default async function ReceivingPage() {
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
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  if (!canManage) redirect("/dashboard");

  let grnsQuery = supabase
    .from("goods_receipts")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const [{ data: suppliers }, { data: warehouseLocations }, { data: purchaseOrders }, { data: allLocations }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("locations")
      .select("*, location_types!inner(code)")
      .eq("organization_id", membership.organization_id)
      .eq("location_types.code", "WAREHOUSE")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("purchase_orders")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .in("status", ["APPROVED", "SENT", "PARTIAL"])
      .order("created_at", { ascending: false }),
    supabase
      .from("locations")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const { data: grns } = await grnsQuery;

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value || allLocations?.[0]?.id || "";

  const filteredGrns = activeBranchId
    ? grns?.filter((g) => g.warehouse_location_id === activeBranchId)
    : grns;



  let canCreate = false;
  if (activeBranchId) {
    if (warehouseLocations?.some((wl) => wl.id === activeBranchId)) {
      canCreate = true;
    }
  } else {
    canCreate = false;
  }

  return (
    <section>
      <GrnListTable
        grns={filteredGrns || []}
        suppliers={suppliers || []}
        warehouseLocations={warehouseLocations || []}
        purchaseOrders={purchaseOrders || []}
        canCreate={canCreate}
      />
    </section>
  );
}
