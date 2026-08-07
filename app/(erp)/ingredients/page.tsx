import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { IngredientsTable } from "@/modules/ingredients/components/ingredients-table";

export default async function IngredientsPage() {
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

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  if (!canManage) redirect("/dashboard");

  const [{ data: ingredients }, { data: categories }, { data: units }, { data: conversions }, { data: locations }, { data: alertPolicies }] =
    await Promise.all([
      supabase
        .from("ingredients")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("ingredient_categories")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("units")
        .select("*")
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("ingredient_unit_conversions")
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
        .from("inventory_alert_policies")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .is("deleted_at", null),
    ]);

  return (
    <section>
      <IngredientsTable
        ingredients={ingredients || []}
        categories={categories || []}
        units={units || []}
        conversions={conversions || []}
        locations={locations || []}
        alertPolicies={alertPolicies || []}
      />
    </section>
  );
}
