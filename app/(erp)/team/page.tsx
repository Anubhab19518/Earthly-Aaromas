import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { TeamManagementClient } from "@/modules/team/components/team-management-client";

export default async function TeamPage() {
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

  if (!membership) redirect("/onboarding");

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "members.manage",
    target_organization_id: membership.organization_id,
  });

  if (!canManage) redirect("/dashboard");

  // Fetch Members
  const { data: membersData } = await supabase
    .from("organization_memberships")
    .select(`
      id,
      user_id,
      status,
      joined_at,
      profiles ( full_name, phone ),
      membership_roles (
        roles ( name, code )
      )
    `)
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null);

  // Fetch Invitations
  const { data: invitations } = await supabase
    .from("organization_invitations")
    .select(`
      id,
      email,
      expires_at,
      accepted_at,
      roles ( name, code )
    `)
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Fetch Available Roles
  const { data: roles } = await supabase
    .from("roles")
    .select("id, name, code")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  // Fetch Locations for branch assignment
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  // Format members
  const activeMembers = membersData?.map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    full_name: m.profiles?.full_name || "Unknown",
    role: m.membership_roles?.[0]?.roles?.name || "No Role",
    role_code: m.membership_roles?.[0]?.roles?.code || "",
    status: m.status,
    joined_at: m.joined_at,
  })) || [];

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Team Management</h2>
          <p className="text-sm text-zinc-500">Manage your employees, roles, and pending invitations.</p>
        </div>
      </div>

      <TeamManagementClient 
        members={activeMembers}
        invitations={invitations || []}
        roles={roles || []}
        locations={locations || []}
        currentUserId={userData.user.id}
      />
    </section>
  );
}
