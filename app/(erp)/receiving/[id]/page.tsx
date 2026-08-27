import { redirect, notFound } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { GrnDetailView } from "@/modules/receiving/components/grn-detail-view";
import { getComments } from "@/modules/shared/services/comments.actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GrnDetailPage({ params }: Props) {
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
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  if (!canManage) redirect("/dashboard");

  const [
    { data: grn },
    { data: items },
    { data: suppliers },
    { data: warehouseLocations },
    { data: ingredients },
    { data: conversions },
    { data: units },
    { data: taxCategories },
  ] = await Promise.all([
    supabase
      .from("goods_receipts")
      .select("*")
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("goods_receipt_items")
      .select("*")
      .eq("goods_receipt_id", id)
      .order("created_at"),
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
      .from("ingredients")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("ingredient_unit_conversions")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null),
    supabase.from("units").select("*").is("deleted_at", null),
    supabase
      .from("tax_categories")
      .select("*, tax_rates(rate_percentage)")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("name"),
  ]);

  const comments = await getComments("GRN", id);

  if (!grn) notFound();

  // If GRN is linked to a PO, fetch PO items and posted receipts for fulfillment tracking
  let poItems: any[] = [];
  let postedPoReceipts: any[] = [];

  if (grn.purchase_order_id) {
    const [{ data: fetchedPoItems }, { data: fetchedPostedReceipts }] = await Promise.all([
      supabase
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", grn.purchase_order_id),
      supabase
        .from("goods_receipt_items")
        .select(`
          id,
          goods_receipt_id,
          purchase_order_item_id,
          ingredient_id,
          received_quantity,
          converted_base_quantity,
          goods_receipts!inner (
            id,
            purchase_order_id,
            status
          )
        `)
        .eq("goods_receipts.purchase_order_id", grn.purchase_order_id)
        .eq("goods_receipts.status", "POSTED"),
    ]);

    poItems = fetchedPoItems || [];
    postedPoReceipts = fetchedPostedReceipts || [];
  }

  return (
    <section>
      <GrnDetailView
        grn={grn}
        items={items || []}
        suppliers={suppliers || []}
        warehouseLocations={warehouseLocations || []}
        ingredients={ingredients || []}
        conversions={conversions || []}
        units={units || []}
        taxCategories={taxCategories || []}
        poItems={poItems}
        postedPoReceipts={postedPoReceipts}
        comments={comments}
      />
    </section>
  );
}
