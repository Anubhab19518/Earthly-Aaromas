import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/shared/lib/supabase/server";
import { RecipeBuilder } from "@/modules/menu/components/recipe-builder";
import { BranchConfigTable } from "@/modules/menu/components/branch-config-table";

export default async function VariantPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
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

  const { data: variant } = await supabase
    .from("menu_variants")
    .select("*, menu_items(id, name, menu_categories(name))")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .single();

  if (!variant) redirect("/menu");

  const [
    { data: recipeItems },
    { data: ingredients },
    { data: units },
    { data: branchConfigs },
    { data: locations }
  ] = await Promise.all([
    supabase
      .from("recipe_items")
      .select("*, ingredients(name, units!base_unit_id(name))")
      .eq("variant_id", id)
      .eq("organization_id", membership.organization_id),
    supabase
      .from("ingredients")
      .select("id, name, base_unit_id")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("units")
      .select("id, name, measurement_category")
      .is("deleted_at", null),
    supabase
      .from("branch_menu_configs")
      .select("*")
      .eq("variant_id", id)
      .eq("organization_id", membership.organization_id),
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name")
  ]);

  return (
    <section className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link
          href={`/menu/items/${variant.menu_item_id}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {variant.menu_items?.name} - {variant.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Category: {variant.menu_items?.menu_categories?.name} • SKU: {variant.sku || "N/A"} • Default Price: ₹{Number(variant.default_price).toFixed(2)}
          </p>
        </div>
      </div>

      <RecipeBuilder
        variantId={id}
        recipeItems={recipeItems || []}
        ingredients={ingredients || []}
        units={units || []}
      />

      <BranchConfigTable
        variantId={id}
        defaultPrice={Number(variant.default_price)}
        configs={branchConfigs || []}
        allLocations={locations || []}
      />
    </section>
  );
}
