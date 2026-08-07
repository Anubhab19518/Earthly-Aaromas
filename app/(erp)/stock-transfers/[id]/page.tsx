import { notFound, redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { StockTransferDetailClient } from "@/modules/inventory/components/stock-transfer-detail-client";
import { cookies } from "next/headers";

export default async function StockTransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: transfer } = await supabase
    .from("stock_transfers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .single();

  if (!transfer) notFound();

  const [{ data: items }, { data: locations }, { data: ingredients }, { data: units }] = await Promise.all([
    supabase.from("stock_transfer_items").select("*").eq("transfer_id", id).order("created_at"),
    supabase.from("locations").select("*").eq("organization_id", membership.organization_id).order("name"),
    supabase.from("ingredients").select("*").eq("organization_id", membership.organization_id).is("deleted_at", null),
    supabase.from("units").select("*").is("deleted_at", null),
  ]);

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value || locations?.[0]?.id || "";

  return (
    <StockTransferDetailClient
      transfer={transfer}
      items={items || []}
      locations={locations || []}
      ingredients={ingredients || []}
      units={units || []}
      activeBranchId={activeBranchId}
    />
  );
}
