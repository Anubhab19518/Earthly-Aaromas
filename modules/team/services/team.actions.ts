"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";

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

  const { error } = await supabase
    .from("organization_memberships")
    .update({ status: "SUSPENDED" })
    .eq("id", memberId);

  if (error) {
    return { message: "Failed to deactivate member." };
  }

  revalidatePath("/team");
  return null;
}
