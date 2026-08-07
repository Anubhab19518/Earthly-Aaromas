import { notFound, redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { PurchaseOrderDetailClient } from "@/modules/purchasing/components/purchase-order-detail-client";

export default async function PurchaseOrderDetailPage({
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

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .single();

  if (!po) notFound();

  const [{ data: items }, { data: suppliers }, { data: locations }, { data: ingredients }, { data: units }, { data: taxCategories }] = await Promise.all([
    supabase.from("purchase_order_items").select("*").eq("po_id", id).order("created_at"),
    supabase.from("suppliers").select("*").eq("organization_id", membership.organization_id),
    supabase.from("locations").select("*").eq("organization_id", membership.organization_id),
    supabase.from("ingredients").select("*").eq("organization_id", membership.organization_id).is("deleted_at", null),
    supabase.from("units").select("*").is("deleted_at", null),
    supabase.from("tax_categories").select("*").eq("organization_id", membership.organization_id).is("deleted_at", null),
  ]);

  return (
    <PurchaseOrderDetailClient
      po={po}
      items={items || []}
      suppliers={suppliers || []}
      locations={locations || []}
      ingredients={ingredients || []}
      units={units || []}
      taxCategories={taxCategories || []}
    />
  );
}
