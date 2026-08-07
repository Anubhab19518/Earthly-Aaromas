import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { LocationsTable } from "@/modules/locations/components/locations-table";

export default async function LocationsPage() {
  const supabase = await createClient();

  // Get active membership
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  // Check master_data.manage permission
  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  if (!canManage) redirect("/dashboard");

  // Fetch location types (global)
  const { data: locationTypes } = await supabase
    .from("location_types")
    .select("*")
    .order("name");

  // Fetch locations
  const { data: locations } = await supabase
    .from("locations")
    .select(`
      *,
      location_types ( code, name ),
      parent:parent_id ( code, name )
    `)
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  return (
    <section>
      <LocationsTable 
        locations={locations || []} 
        locationTypes={locationTypes || []} 
      />
    </section>
  );
}
