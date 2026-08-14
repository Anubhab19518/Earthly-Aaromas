"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createInvitationSchema, acceptInvitationSchema } from "@/modules/team/schemas/invitation.schema";
import crypto from "crypto";
import { Resend } from "resend";

export type InvitationActionState = { message: string; inviteLink?: string } | null;

async function getAuthContext(supabase: any) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "members.manage",
    target_organization_id: membership.organization_id,
  });

  return canManage
    ? { organizationId: membership.organization_id, userId: userData.user.id }
    : null;
}

// ─── Generate secure token ───────────────────────────────────────────────────

function generateInvitationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

// ─── Create Invitation ───────────────────────────────────────────────────────

export async function createInvitation(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = createInvitationSchema.safeParse({
    email: formData.get("email"),
    role_id: formData.get("role_id"),
    location_id: formData.get("location_id") || null,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  // Verify the role belongs to the organization
  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("id", parsed.data.role_id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!role) return { message: "Invalid role selected." };

  // Check if they are already an active member
  // Note: users table is auth.users, we can't easily join by email unless we use admin client or rely on a membership email table.
  // We'll rely on the unique index for pending invites.

  const { rawToken, tokenHash } = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiry

  const { error } = await supabase.from("organization_invitations").insert({
    organization_id: auth.organizationId,
    email: parsed.data.email,
    role_id: parsed.data.role_id,
    location_id: parsed.data.location_id,
    invited_by: auth.userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    if (error.code === "23505") return { message: "An active invitation for this email already exists." };
    return { message: "Could not create invitation. " + error.message };
  }

  revalidatePath("/team");
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${appUrl}/accept-invite?token=${rawToken}`;
  
  // In development, it is helpful to log the link in case email sending fails
  console.log(`[DEV] Generated Invite Link for ${parsed.data.email}: ${inviteLink}`);
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: resendError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: parsed.data.email,
      subject: 'You have been invited to join Tea-Chain ERP',
      html: `<p>You have been invited to join a workspace on Tea-Chain ERP.</p><p>Click <a href="${inviteLink}">here</a> to accept the invitation.</p>`
    });
    
    if (resendError) {
      console.error("Resend API returned an error:", resendError);
      return { message: "Invitation created, but failed to send email. Check server logs for the link." };
    }
  } catch (err) {
    console.error("Failed to execute Resend client:", err);
    return { message: "Invitation created, but failed to send email. Check server logs for the link." };
  }
  
  return { message: "Invitation created successfully." };
}

// ─── Verify Invitation (Read-only) ──────────────────────────────────────────

export async function verifyInvitation(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  
  // We use the service role because the user is unauthenticated
  const adminClient = createAdminClient();
  
  const { data, error } = await adminClient.rpc("validate_invitation_token", { p_token_hash: tokenHash });
  
  if (error || !data || data.length === 0) return null;
  return data[0];
}

// ─── Accept Invitation ───────────────────────────────────────────────────────

export async function acceptInvitation(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = acceptInvitationSchema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    phoneNumber: formData.get("phoneNumber"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const rawToken = parsed.data.token;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  
  const adminClient = createAdminClient();
  
  // 1. Validate token again securely
  const { data: invData, error: invError } = await adminClient.rpc("validate_invitation_token", { p_token_hash: tokenHash });
  
  if (invError || !invData || invData.length === 0) {
    return { message: "Invalid or expired invitation token." };
  }
  
  const invitation = invData[0];

  // 2. Create the user in Supabase Auth via Admin API
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: invitation.email,
    password: parsed.data.password,
    email_confirm: true, // auto confirm so they can login immediately
  });

  if (authError) {
    // If user already exists, it throws an error. We can optionally handle it by updating their password or linking.
    // For now, if they exist, let's just proceed to link them.
    if (authError.message.includes("already registered")) {
      // Actually we'd need their user_id to link them.
      // Let's get the user by email
      const { data: existingUsers, error: getError } = await adminClient.auth.admin.listUsers();
      // listUsers isn't ideal for large datasets but for demo it's ok, or we can just return error.
      // Better: we can just return an error and ask them to login.
      return { message: "An account with this email already exists." };
    }
    return { message: authError.message };
  }

  const userId = authUser.user.id;

  // 3. Update the profile created by the trigger `handle_new_user` automatically.
  await adminClient
    .from("profiles")
    .update({ 
      full_name: parsed.data.fullName, 
      phone: parsed.data.phoneNumber || null 
    })
    .eq("id", userId);
  
  // 4. Create Membership
  const { error: membershipError } = await adminClient.from("organization_memberships").insert({
    organization_id: invitation.organization_id,
    user_id: userId,
    status: "ACTIVE",
    joined_at: new Date().toISOString(),
    location_id: invitation.location_id || null,
  });

  if (membershipError) {
    return { message: "Failed to create membership. Please contact support." };
  }

  // 5. Get the newly created membership ID
  const { data: membership } = await adminClient
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", invitation.organization_id)
    .eq("user_id", userId)
    .single();

  if (membership) {
    // 6. Assign Role
    await adminClient.from("membership_roles").insert({
      membership_id: membership.id,
      role_id: invitation.role_id,
    });
  }

  // 7. Mark invitation as accepted
  await adminClient
    .from("organization_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("invitation_id", invitation.invitation_id); // Wait, RPC returned it as invitation_id.
    // Actually, in the table it's `id`
    
  await adminClient
    .from("organization_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.invitation_id);

  return { message: "Success" };
}
