import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { getAuditLog } from "@/modules/audit/services/audit-log.actions";
import { AuditLogClient } from "@/modules/audit/components/audit-log-client";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  if (!membership) {
    redirect("/onboarding");
  }

  // Only users with OWNER permissions should access this. Let's check permissions.
  const { data: isOwner } = await supabase.rpc("has_permission", {
    required_permission_code: "master_data.manage", // Assuming owner has this
    target_organization_id: membership.organization_id,
  });

  if (!isOwner) {
    redirect("/dashboard");
  }

  const orgId = membership.organization_id;
  const resolvedParams = await searchParams;

  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const actorId = typeof resolvedParams.actor_id === "string" ? resolvedParams.actor_id : undefined;
  const action = typeof resolvedParams.action === "string" ? resolvedParams.action : undefined;
  const entityType = typeof resolvedParams.entity_type === "string" ? resolvedParams.entity_type : undefined;
  
  // Fetch log data
  const result = await getAuditLog(orgId, {
    page,
    pageSize: 20,
    actorId,
    action,
    entityType,
  });

  // Fetch profiles for filter options
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email");

  // Fetch unique entity types for filter
  const { data: uniqueEntityTypes } = (await supabase
    .rpc("get_unique_entity_types", { p_org_id: orgId })) as any;

  return (
    <div className="mx-auto max-w-7xl">
      <AuditLogClient 
        initialData={result.data}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
        currentPage={page}
        profiles={profiles || []}
        entityTypes={uniqueEntityTypes || []}
      />
    </div>
  );
}
