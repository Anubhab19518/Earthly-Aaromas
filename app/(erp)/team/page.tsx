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
      location_id,
      locations ( name ),
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
      location_id,
      locations ( name ),
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

  // Helper to format name from email prefix
  const formatNameFromEmail = (email: string) => {
    if (!email) return "Invited Member";
    const namePart = email.split("@")[0];
    return namePart
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Format members
  const activeMembers = membersData?.map((m: any) => {
    const isSelf = m.user_id === userData.user.id;
    // Find matching invitation by comparing joined_at and accepted_at (they happen within seconds of each other)
    const matchedInvite = invitations?.find((inv: any) => {
      if (!inv.accepted_at) return false;
      const timeDiff = Math.abs(new Date(inv.accepted_at).getTime() - new Date(m.joined_at).getTime());
      return timeDiff < 10000; // Within 10 seconds
    });
    const email = isSelf
      ? userData.user.email
      : matchedInvite?.email ||
        `${(m.profiles?.full_name || "member").toLowerCase().replace(/\s+/g, ".")}@earthlyaaromas.com`;

    return {
      id: m.id,
      user_id: m.user_id,
      full_name: m.profiles?.full_name || "Unknown Member",
      email: email || "",
      phone: m.profiles?.phone || "",
      role: m.membership_roles?.[0]?.roles?.name || "No Role",
      role_code: m.membership_roles?.[0]?.roles?.code || "",
      location_name: m.locations?.name || "All Branches",
      status: m.status,
      joined_at: m.joined_at,
    };
  }) || [];

  const pendingInvitations = invitations?.filter((inv: any) => !inv.accepted_at) || [];

  const formattedInvitations = pendingInvitations.map((inv: any) => ({
    ...inv,
    full_name: formatNameFromEmail(inv.email),
    location_name: inv.locations?.name || "All Branches",
  }));

  return (
    <div className="mx-auto max-w-7xl px-2 py-6 sm:px-2 lg:px-4">
      <TeamManagementClient 
        members={activeMembers}
        invitations={formattedInvitations}
        roles={roles || []}
        locations={locations || []}
        currentUserId={userData.user.id}
      />
    </div>
  );
}
