"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";

export type TeamActionState = { message: string } | null;

export async function deactivateEmployee(
  _previousState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const memberId = formData.get("id") as string;
  if (!memberId) return { message: "Invalid request." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { message: "Unauthorized." };

  // Fetch membership to check permissions
  const { data: myMembership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!myMembership) return { message: "Unauthorized." };

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "members.manage",
    target_organization_id: myMembership.organization_id,
  });

  if (!canManage) return { message: "Permission denied." };

  // Verify the target member belongs to the same org
  const { data: targetMembership } = await supabase
    .from("organization_memberships")
    .select("organization_id, user_id")
    .eq("id", memberId)
    .single();

  if (!targetMembership || targetMembership.organization_id !== myMembership.organization_id) {
    return { message: "Member not found." };
  }
  
  if (targetMembership.user_id === userData.user.id) {
      return { message: "You cannot deactivate yourself." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("organization_memberships")
    .update({ status: "SUSPENDED", deleted_at: new Date().toISOString() })
    .eq("id", memberId);

  if (error) {
    return { message: "Failed to deactivate member: " + error.message };
  }

  revalidatePath("/team");
  return null;
}

export async function resetEmployeePassword(
  _previousState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const memberId = formData.get("id") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!memberId || !newPassword || newPassword.length < 6) {
    return { message: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { message: "Unauthorized." };

  const { data: myMembership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!myMembership) return { message: "Unauthorized." };

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "members.manage",
    target_organization_id: myMembership.organization_id,
  });

  if (!canManage) return { message: "Permission denied." };

  const { data: targetMembership } = await supabase
    .from("organization_memberships")
    .select("organization_id, user_id")
    .eq("id", memberId)
    .single();

  if (!targetMembership || targetMembership.organization_id !== myMembership.organization_id) {
    return { message: "Member not found." };
  }

  const adminClient = createAdminClient();
  const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetMembership.user_id, {
    password: newPassword,
  });

  if (updateErr) {
    return { message: "Failed to update password: " + updateErr.message };
  }

  revalidatePath("/team");
  return { message: "Password updated successfully." };
}
