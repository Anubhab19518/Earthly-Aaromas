"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createAlertPolicySchema,
  updateAlertPolicySchema,
  deleteAlertPolicySchema,
} from "@/modules/inventory/schemas/alert-policy.schema";

export type AlertPolicyActionState = {
  message: string;
} | null;

async function getActiveOrganizationId(supabase: any) {
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: canManage } = await supabase.rpc("has_permission", {
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  return canManage ? membership.organization_id : null;
}

export async function createAlertPolicy(
  _previousState: AlertPolicyActionState,
  formData: FormData,
): Promise<AlertPolicyActionState> {
  const parsedInput = createAlertPolicySchema.safeParse({
    location_id: formData.get("location_id"),
    ingredient_id: formData.get("ingredient_id"),
    warning_level: Number(formData.get("warning_level")),
    critical_level: Number(formData.get("critical_level")),
    out_of_stock_level: Number(formData.get("out_of_stock_level")),
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid alert policy details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase.from("inventory_alert_policies").insert({
    organization_id: organizationId,
    location_id: parsedInput.data.location_id,
    ingredient_id: parsedInput.data.ingredient_id,
    warning_level: parsedInput.data.warning_level,
    critical_level: parsedInput.data.critical_level,
    out_of_stock_level: parsedInput.data.out_of_stock_level,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "An alert policy already exists for this ingredient at this location." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not create the alert policy. Please try again." };
  }

  revalidatePath("/ingredients");
  return null;
}

export async function updateAlertPolicy(
  _previousState: AlertPolicyActionState,
  formData: FormData,
): Promise<AlertPolicyActionState> {
  const parsedInput = updateAlertPolicySchema.safeParse({
    id: formData.get("id"),
    warning_level: Number(formData.get("warning_level")),
    critical_level: Number(formData.get("critical_level")),
    out_of_stock_level: Number(formData.get("out_of_stock_level")),
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid alert policy details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("inventory_alert_policies")
    .update({
      warning_level: parsedInput.data.warning_level,
      critical_level: parsedInput.data.critical_level,
      out_of_stock_level: parsedInput.data.out_of_stock_level,
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not update the alert policy. Please try again." };
  }

  revalidatePath("/ingredients");
  return null;
}

export async function deleteAlertPolicy(
  _previousState: AlertPolicyActionState,
  formData: FormData,
): Promise<AlertPolicyActionState> {
  const parsedInput = deleteAlertPolicySchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) return { message: "Invalid request." };

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("inventory_alert_policies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) return { message: "We could not delete the alert policy. Please try again." };

  revalidatePath("/ingredients");
  return null;
}
