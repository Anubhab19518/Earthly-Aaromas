import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { MenuClient } from "@/modules/menu/components/menu-client";

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
    <MenuClient 
      items={items || []} 
      categories={categories || []} 
      taxCategories={taxCategories || []} 
    />
  );
}
