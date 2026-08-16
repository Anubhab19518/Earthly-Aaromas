import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { PurchaseOrderForm } from "@/modules/purchasing/components/purchase-order-form";

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const [
    { data: suppliers },
    { data: locations },
    { data: ingredients },
    { data: units },
    { data: taxCategories },
    { data: conversions },
  ] = await Promise.all([
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
      .from("units")
      .select("*")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("tax_categories")
      .select("*, tax_rates(rate_percentage)")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("ingredient_unit_conversions")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null),
  ]);

  return (
    <PurchaseOrderForm
      suppliers={suppliers || []}
      locations={locations || []}
      ingredients={ingredients || []}
      units={units || []}
      taxCategories={taxCategories || []}
      conversions={conversions || []}
    />
  );
}
