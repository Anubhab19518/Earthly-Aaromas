import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { SuppliersTable } from "@/modules/suppliers/components/suppliers-table";

export default async function SuppliersPage() {
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

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  return (
    <section>
      <SuppliersTable suppliers={suppliers || []} />
    </section>
  );
}
