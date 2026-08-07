import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { CategoriesClient } from "@/modules/ingredients/components/categories-client";

export default async function IngredientCategoriesPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) redirect("/login");

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

  const { data: categories } = await supabase
    .from("ingredient_categories")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Ingredient Categories</h2>
          <p className="text-sm text-zinc-500">Manage your ingredient categories.</p>
        </div>
      </div>
      <CategoriesClient categories={categories || []} />
    </section>
  );
}
