"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createInvitationSchema, acceptInvitationSchema } from "@/modules/team/schemas/invitation.schema";
import crypto from "crypto";
import { Resend } from "resend";

export type InvitationActionState = {
  message: string;
  credentials?: {
    email: string;
    password: string;
    fullName: string;
    roleName: string;
    locationName?: string;
  };
} | null;

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

// ─── Create & Provision Employee Directly (With Owner Password) ──────────────

export async function createInvitation(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = createInvitationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || null,
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
    .select("id, name, code")
    .eq("id", parsed.data.role_id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!role) return { message: "Invalid role selected." };

  let locationName = "All Branches";
  if (parsed.data.location_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("name")
      .eq("id", parsed.data.location_id)
      .single();
    if (loc) locationName = loc.name;
  }

  const adminClient = createAdminClient();

  // 1. Check if user already exists in auth.users
  const { data: userList } = await adminClient.auth.admin.listUsers();
  const existingUser = userList?.users?.find(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase()
  );

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    // Update password and metadata
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: parsed.data.password,
      user_metadata: { full_name: parsed.data.fullName, phone: parsed.data.phone || null },
    });
    if (updateErr) {
      return { message: "Could not update user account: " + updateErr.message };
    }
  } else {
    // Create the user in Auth directly
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true, // auto confirm so they can log in immediately
      user_metadata: { full_name: parsed.data.fullName, phone: parsed.data.phone || null },
    });

    if (createErr || !newUser.user) {
      return { message: "Could not create user account: " + (createErr?.message || "Unknown error") };
    }
    userId = newUser.user.id;
  }

  // 2. Upsert profile
  await adminClient.from("profiles").upsert({
    id: userId,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone || null,
  });

  // 3. Upsert organization membership
  const { data: existingMembership } = await adminClient
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", auth.organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  let membershipId: string;

  if (existingMembership) {
    membershipId = existingMembership.id;
    await adminClient
      .from("organization_memberships")
      .update({
        status: "ACTIVE",
        location_id: parsed.data.location_id || null,
        deleted_at: null,
      })
      .eq("id", membershipId);
  } else {
    const { data: newMem, error: memErr } = await adminClient
      .from("organization_memberships")
      .insert({
        organization_id: auth.organizationId,
        user_id: userId,
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
        location_id: parsed.data.location_id || null,
      })
      .select("id")
      .single();

    if (memErr || !newMem) {
      return { message: "Failed to establish organization membership." };
    }
    membershipId = newMem.id;
  }

  // 4. Assign role in membership_roles
  await adminClient.from("membership_roles").delete().eq("membership_id", membershipId);
  await adminClient.from("membership_roles").insert({
    membership_id: membershipId,
    role_id: parsed.data.role_id,
  });

  // 5. Store in organization_invitations as accepted for record keeping
  const { tokenHash } = generateInvitationToken();
  await adminClient.from("organization_invitations").insert({
    organization_id: auth.organizationId,
    email: parsed.data.email,
    role_id: parsed.data.role_id,
    location_id: parsed.data.location_id || null,
    invited_by: auth.userId,
    token_hash: tokenHash,
    expires_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
  });

  revalidatePath("/team");

  // 6. Send email notification with login credentials
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const loginLink = role.code === "OWNER" || role.code === "ADMIN" ? `${appUrl}/login` : `${appUrl}/employee-login`;

  console.log(`[DEV] Employee Provisioned: ${parsed.data.email} | Password: ${parsed.data.password} | Login: ${loginLink}`);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Earthly Aaromas <onboarding@resend.dev>";
    await resend.emails.send({
      from: fromEmail,
      to: parsed.data.email,
      subject: "Welcome to Tea-Chain ERP - Your Account Credentials",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Welcome to Tea-Chain ERP</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #475569;">Hello <strong>${parsed.data.fullName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #475569;">Your account has been created with access to the <strong>${locationName}</strong> workspace as <strong>${role.name}</strong>.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b;">Your Login Credentials</p>
            <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Email:</strong> <span style="font-family: monospace;">${parsed.data.email}</span></p>
            <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${parsed.data.password}</span></p>
          </div>

          <div style="margin: 24px 0;">
            <a href="${loginLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">Sign in to Workspace</a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Please keep your login credentials secure. You can sign in directly at <a href="${loginLink}" style="color: #4f46e5;">${loginLink}</a></p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Resend error sending credentials:", err);
  }

  return {
    message: "Member account created successfully.",
    credentials: {
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
      roleName: role.name,
      locationName,
    },
  };
}

// ─── Verify Invitation (Read-only) ──────────────────────────────────────────

export async function verifyInvitation(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
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
  
  const { data: invData, error: invError } = await adminClient.rpc("validate_invitation_token", { p_token_hash: tokenHash });
  
  if (invError || !invData || invData.length === 0) {
    return { message: "Invalid or expired invitation token." };
  }
  
  const invitation = invData[0];

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: invitation.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, phone: parsed.data.phoneNumber || null },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { message: "An account with this email already exists." };
    }
    return { message: authError.message };
  }

  const userId = authUser.user.id;

  await adminClient
    .from("profiles")
    .upsert({ 
      id: userId,
      full_name: parsed.data.fullName, 
      phone: parsed.data.phoneNumber || null 
    });
  
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

  const { data: membership } = await adminClient
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", invitation.organization_id)
    .eq("user_id", userId)
    .single();

  if (membership) {
    await adminClient.from("membership_roles").insert({
      membership_id: membership.id,
      role_id: invitation.role_id,
    });
  }

  await adminClient
    .from("organization_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.invitation_id);

  return { message: "Success" };
}
