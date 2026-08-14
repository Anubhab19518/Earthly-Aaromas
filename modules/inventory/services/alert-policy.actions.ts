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

export type InventoryAlert = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  level: "OUT_OF_STOCK" | "CRITICAL" | "WARNING";
};

export async function getActiveInventoryAlerts(locationId: string): Promise<InventoryAlert[]> {
  if (!locationId) return [];

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);
  if (!organizationId) return [];

  // Fetch policies with ingredient names
  const { data: policies } = await supabase
    .from("inventory_alert_policies")
    .select("ingredient_id, warning_level, critical_level, out_of_stock_level, ingredients(name)")
    .eq("location_id", locationId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (!policies || policies.length === 0) return [];

  const ingredientIds = policies.map((p: any) => p.ingredient_id);

  // Fetch current snapshots
  const { data: snapshots } = await supabase
    .from("inventory_snapshot")
    .select("ingredient_id, quantity_on_hand")
    .eq("location_id", locationId)
    .eq("organization_id", organizationId)
    .in("ingredient_id", ingredientIds);

  const snapshotMap = new Map(snapshots?.map((s: any) => [s.ingredient_id, Number(s.quantity_on_hand)]) || []);

  const alerts: InventoryAlert[] = [];

  for (const policy of policies) {
    const qty = snapshotMap.get(policy.ingredient_id) || 0;
    const outOfStockLevel = Number(policy.out_of_stock_level);
    const criticalLevel = Number(policy.critical_level);
    const warningLevel = Number(policy.warning_level);

    if (qty <= outOfStockLevel) {
      alerts.push({
        ingredientId: policy.ingredient_id,
        ingredientName: (policy.ingredients as any)?.name || "Unknown",
        quantity: qty,
        level: "OUT_OF_STOCK",
      });
    } else if (qty <= criticalLevel) {
      alerts.push({
        ingredientId: policy.ingredient_id,
        ingredientName: (policy.ingredients as any)?.name || "Unknown",
        quantity: qty,
        level: "CRITICAL",
      });
    } else if (qty <= warningLevel) {
      alerts.push({
        ingredientId: policy.ingredient_id,
        ingredientName: (policy.ingredients as any)?.name || "Unknown",
        quantity: qty,
        level: "WARNING",
      });
    }
  }

  // Sort: Out of stock first, then critical, then warning
  const order = { OUT_OF_STOCK: 1, CRITICAL: 2, WARNING: 3 };
  alerts.sort((a, b) => order[a.level] - order[b.level]);

  return alerts;
}
