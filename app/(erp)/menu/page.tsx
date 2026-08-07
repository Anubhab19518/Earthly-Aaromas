import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { MenuCategoriesTable } from "@/modules/menu/components/menu-categories-table";
import { MenuItemsTable } from "@/modules/menu/components/menu-items-table";

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
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Menu Management</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Configure menu categories and items.
          </p>
        </div>
      </div>

      <MenuCategoriesTable categories={categories || []} />
      <MenuItemsTable 
        items={items || []} 
        categories={categories || []} 
        taxCategories={taxCategories || []} 
      />
    </section>
  );
}
