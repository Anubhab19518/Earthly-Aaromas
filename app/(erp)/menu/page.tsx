import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { MenuCategoriesTable } from "@/modules/menu/components/menu-categories-table";
import { MenuItemsTable } from "@/modules/menu/components/menu-items-table";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import { Utensils, Tag } from "lucide-react";

export default async function MenuPage() {
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
    { data: categories },
    { data: items },
    { data: taxCategories }
  ] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("menu_items")
      .select("*, menu_categories(name)")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("tax_categories")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name")
  ]);

  return (
    <section className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Products & Catalog"
        title="Menu Catalog & Recipes"
        description="Configure menu categories, dish variants, prices, and tax rate associations"
        icon={Utensils}
        iconBgColor="bg-amber-500 text-white"
        tabs={[
          { id: "menu-items", label: "Menu Items", icon: Utensils, count: (items || []).length },
          { id: "menu-categories", label: "Categories", icon: Tag, count: (categories || []).length },
        ]}
      />

      <div id="menu-items">
        <MenuItemsTable 
          items={items || []} 
          categories={categories || []} 
          taxCategories={taxCategories || []} 
        />
      </div>

      <div id="menu-categories">
        <MenuCategoriesTable categories={categories || []} />
      </div>
    </section>
  );
}
