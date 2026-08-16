import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Utensils, Tag, Layers, DollarSign, Barcode } from "lucide-react";
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
    { data: locations },
    { data: ingredientConversions },
  ] = await Promise.all([
    supabase
      .from("recipe_items")
      .select("*, ingredients(name, units!base_unit_id(name))")
      .eq("variant_id", id)
      .eq("organization_id", membership.organization_id),
    supabase
      .from("ingredients")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("units")
      .select("*")
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
      .order("name"),
    supabase
      .from("ingredient_unit_conversions")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null),
  ]);

  return (
    <section className="space-y-4 pb-16 font-sans text-xs">
      {/* Jira-Style Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link href="/menu" className="hover:text-blue-600 hover:underline flex items-center gap-1.5">
          <Utensils className="h-3.5 w-3.5 text-blue-600" />
          <span>Menu Catalog</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <Link
          href={`/menu/items/${variant.menu_item_id}`}
          className="hover:text-blue-600 hover:underline"
        >
          {variant.menu_items?.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-900 font-semibold">{variant.name}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-md border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {variant.menu_items?.name} — {variant.name}
            </h1>
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
              <Tag className="h-3 w-3 text-blue-600" />
              <span>{variant.menu_items?.menu_categories?.name || "Catalog"}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pt-0.5">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-slate-400" />
              <span>Selling Price:</span>
              <strong className="text-slate-900 font-mono font-semibold">
                ₹{Number(variant.default_price).toFixed(2)}
              </strong>
            </div>
            {variant.sku && (
              <div className="flex items-center gap-1">
                <Barcode className="h-3.5 w-3.5 text-slate-400" />
                <span>SKU:</span>
                <strong className="text-slate-700 font-mono">{variant.sku}</strong>
              </div>
            )}
            {variant.serving_size && (
              <div className="flex items-center gap-1">
                <span>Portion:</span>
                <strong className="text-slate-700">{variant.serving_size}</strong>
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/menu/items/${variant.menu_item_id}`}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Item</span>
        </Link>
      </div>

      {/* Recipe Builder */}
      <RecipeBuilder
        variantId={id}
        recipeItems={recipeItems || []}
        ingredients={ingredients || []}
        units={units || []}
        ingredientConversions={ingredientConversions || []}
      />

      {/* Branch Overrides */}
      <BranchConfigTable
        variantId={id}
        defaultPrice={Number(variant.default_price)}
        configs={branchConfigs || []}
        allLocations={locations || []}
      />
    </section>
  );
}
