import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";
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

  const adminClient = createAdminClient();

  // 1. Fetch Members using adminClient to read profiles across the entire organization
  const { data: membersData } = await adminClient
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

  // 2. Fetch Auth Users via Admin API for true emails & metadata names
  const { data: authUsersResponse } = await adminClient.auth.admin.listUsers();
  const authUsers = authUsersResponse?.users || [];
  const authUserMap = new Map<string, { email?: string; full_name?: string; phone?: string }>();

  authUsers.forEach((u) => {
    const meta = u.user_metadata || {};
    const metaName = meta.full_name || meta.name || meta.fullName || "";
    authUserMap.set(u.id, {
      email: u.email,
      full_name: metaName,
      phone: u.phone || meta.phone,
    });
  });

  // 3. Fetch Invitations
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

  // 4. Fetch Available Roles
  const { data: roles } = await supabase
    .from("roles")
    .select("id, name, code")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  // 5. Fetch Locations for branch assignment
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("name");

  // Helper to format clean, professional name from email prefix
  const formatNameFromEmail = (email: string) => {
    if (!email) return "Team Member";
    const prefix = email.split("@")[0];
    // Strip trailing digits (e.g. rohit19518 -> rohit)
    const cleanPrefix = prefix.replace(/\d+$/, "");
    const parts = (cleanPrefix || prefix).split(/[._-]/).filter(Boolean);
    if (parts.length === 0) {
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return parts
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Format members
  const activeMembers = membersData?.map((m: any) => {
    const isSelf = m.user_id === userData.user.id;
    const authUser = authUserMap.get(m.user_id);

    // Find matching invitation if any
    const matchedInvite = invitations?.find((inv: any) => {
      if (authUser?.email && inv.email && inv.email.toLowerCase() === authUser.email.toLowerCase()) {
        return true;
      }
      if (!inv.accepted_at) return false;
      const timeDiff = Math.abs(new Date(inv.accepted_at).getTime() - new Date(m.joined_at).getTime());
      return timeDiff < 60000;
    });

    const email = authUser?.email || (isSelf ? userData.user.email : matchedInvite?.email) || "";

    // Resolve accurate full name
    let fullName =
      (m.profiles?.full_name && m.profiles.full_name.trim() !== "Unknown") ? m.profiles.full_name.trim() : "";
    
    if (!fullName && authUser?.full_name && authUser.full_name.trim() !== "Unknown") {
      fullName = authUser.full_name.trim();
    }

    if (!fullName && email) {
      fullName = formatNameFromEmail(email);
    }

    if (!fullName) {
      fullName = "Team Member";
    }

    const phone = m.profiles?.phone || authUser?.phone || "";

    return {
      id: m.id,
      user_id: m.user_id,
      full_name: fullName,
      email: email || "",
      phone: phone || "",
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
