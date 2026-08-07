import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { StockTransferListTable } from "@/modules/inventory/components/stock-transfer-list-table";
import { cookies } from "next/headers";

export default async function StockTransfersPage() {
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

  let query = supabase
    .from("stock_transfers")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  const [{ data: transfers }, { data: locations }] = await Promise.all([
    query,
    supabase
      .from("locations")
      .select("*, location_types(code)")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value || locations?.[0]?.id || "";

  // Filter transfers client-side or we can just pass them and let the list table filter them.
  // Actually, we should filter them here to match the active branch.
  const filteredTransfers = activeBranchId
    ? transfers?.filter(
        (t) =>
          t.source_location_id === activeBranchId ||
          t.destination_location_id === activeBranchId
      )
    : transfers;

  let canCreate = false;
  if (activeBranchId) {
    const activeLocation = locations?.find(l => l.id === activeBranchId);
    if (activeLocation?.location_types?.code === "WAREHOUSE") {
      canCreate = true;
    }
  }

  return (
    <section>
      <StockTransferListTable
        transfers={filteredTransfers || []}
        locations={locations || []}
        activeBranchId={activeBranchId}
        canCreate={canCreate}
      />
    </section>
  );
}
