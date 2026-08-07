import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { UnitsTable } from "@/modules/units/components/units-table";

export default async function UnitsPage() {
  const supabase = await createClient();

  // Check global master_data.manage permission
  const { data: canManage } = await supabase.rpc("has_global_permission", {
    required_permission_code: "master_data.manage",
  });

  if (!canManage) redirect("/dashboard");

  // Fetch units
  const { data: units } = await supabase
    .from("units")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  return (
    <section>
      <UnitsTable units={units || []} />
    </section>
  );
}
