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

  const grnsQuery = supabase
    .from("goods_receipts")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const [{ data: suppliers }, { data: locations }, { data: purchaseOrders }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("locations")
      .select("*, location_types(code, name)")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("purchase_orders")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .in("status", ["APPROVED", "SENT", "PARTIAL"])
      .order("created_at", { ascending: false }),
  ]);

  const { data: grns } = await grnsQuery;

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value || "";

  const filteredGrns = activeBranchId && activeBranchId !== "GLOBAL"
    ? grns?.filter((g) => g.warehouse_location_id === activeBranchId)
    : grns;

  return (
    <section>
      <GrnListTable
        grns={filteredGrns || []}
        suppliers={suppliers || []}
        warehouseLocations={locations || []}
        purchaseOrders={purchaseOrders || []}
        canCreate={Boolean(canManage)}
      />
    </section>
  );
}
