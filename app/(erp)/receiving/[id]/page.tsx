import { redirect, notFound } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { GrnDetailView } from "@/modules/receiving/components/grn-detail-view";

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
      .select("*, location_types!inner(code)")
      .eq("organization_id", membership.organization_id)
      .eq("location_types.code", "WAREHOUSE")
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
      .select("*")
      .eq("organization_id", membership.organization_id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (!grn) notFound();

  return (
    <section className="px-4 py-6">
      <GrnDetailView
        grn={grn}
        items={items || []}
        suppliers={suppliers || []}
        warehouseLocations={warehouseLocations || []}
        ingredients={ingredients || []}
        conversions={conversions || []}
        units={units || []}
        taxCategories={taxCategories || []}
      />
    </section>
  );
}
