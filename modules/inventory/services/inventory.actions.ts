"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import {
  postInventoryMovementSchema,
  PostInventoryMovementInput,
  stockAdjustmentFormSchema,
} from "@/modules/inventory/schemas/inventory.schema";

export type InventoryActionState = {
  message: string;
} | null;

async function getActiveOrganizationAndUser(supabase: any) {
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
    required_permission_code: "inventory.manage",
    target_organization_id: membership.organization_id,
  });

  return canManage ? { organizationId: membership.organization_id, userId: userData.user.id } : null;
}

export async function postInventoryMovement(input: PostInventoryMovementInput) {
  const parsedInput = postInventoryMovementSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "Invalid movement details.");
  }

  const supabase = await createClient();
  const authContext = await getActiveOrganizationAndUser(supabase);

  if (!authContext) throw new Error("Unauthorized or missing permission.");

  const { data: ledgerId, error } = await supabase.rpc("post_inventory_movement", {
    p_organization_id: authContext.organizationId,
    p_location_id: parsedInput.data.location_id,
    p_ingredient_id: parsedInput.data.ingredient_id,
    p_transaction_type: parsedInput.data.transaction_type,
    p_reference_type: parsedInput.data.reference_type || null,
    p_reference_id: parsedInput.data.reference_id || null,
    p_quantity_change: parsedInput.data.quantity_change,
    p_unit_id: parsedInput.data.unit_id,
    p_running_cost: parsedInput.data.running_cost || null,
    p_remarks: parsedInput.data.remarks || null,
  });

  if (error) {
    throw new Error(error.message || "Failed to post inventory movement.");
  }

  return ledgerId;
}

export async function createStockAdjustment(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsedInput = stockAdjustmentFormSchema.safeParse({
    location_id: formData.get("location_id"),
    ingredient_id: formData.get("ingredient_id"),
    reason: formData.get("reason"),
    quantity_change: Number(formData.get("quantity_change")),
    remarks: formData.get("remarks"),
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid adjustment details." };
  }

  const supabase = await createClient();
  const authContext = await getActiveOrganizationAndUser(supabase);

  if (!authContext) return { message: "Unauthorized or missing permission." };

  // Fetch the ingredient to get the base_unit_id
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("base_unit_id")
    .eq("id", parsedInput.data.ingredient_id)
    .eq("organization_id", authContext.organizationId)
    .single();

  if (!ingredient) return { message: "Ingredient not found." };

  const quantityChange = parsedInput.data.quantity_change;
  
  let transactionType = "STOCK_ADJUSTMENT";
  if (parsedInput.data.reason === "DAMAGE" || parsedInput.data.reason === "EXPIRY") {
    transactionType = "WASTAGE";
  }

  try {
    await postInventoryMovement({
      location_id: parsedInput.data.location_id,
      ingredient_id: parsedInput.data.ingredient_id,
      transaction_type: transactionType as any,
      reference_type: "MANUAL",
      reference_id: parsedInput.data.reason,
      quantity_change: quantityChange,
      unit_id: ingredient.base_unit_id, // Always post in base unit
      remarks: parsedInput.data.remarks || null,
    });

    revalidatePath("/inventory");
    return null;
  } catch (err: any) {
    return { message: err.message || "An error occurred while posting inventory." };
  }
}
