import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { TaxesTable } from "@/modules/taxes/components/taxes-table";

export default async function TaxesPage() {
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

  const [{ data: categories }, { data: rates }] = await Promise.all([
    supabase
      .from("tax_categories")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("tax_rates")
      .select("*, tax_categories!inner(organization_id)")
      .eq("tax_categories.organization_id", membership.organization_id)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false }),
  ]);

  return (
    <section>
      <TaxesTable categories={categories || []} rates={rates || []} />
    </section>
  );
}
