"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createConversionSchema,
  updateConversionSchema,
  deleteConversionSchema,
} from "@/modules/ingredients/schemas/ingredient-conversion.schema";

export type ConversionActionState = {
  message: string;
} | null;

async function getActiveOrganizationId(supabase: any): Promise<string | null> {
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

export async function createConversion(
  _previousState: ConversionActionState,
  formData: FormData,
): Promise<ConversionActionState> {
  const parsedInput = createConversionSchema.safeParse({
    ingredient_id: formData.get("ingredient_id"),
    from_unit_id: formData.get("from_unit_id"),
    to_unit_id: formData.get("to_unit_id"),
    conversion_factor: Number(formData.get("conversion_factor")),
    notes: formData.get("notes") || null,
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid conversion details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase.from("ingredient_unit_conversions").insert({
    organization_id: organizationId,
    ingredient_id: parsedInput.data.ingredient_id,
    from_unit_id: parsedInput.data.from_unit_id,
    to_unit_id: parsedInput.data.to_unit_id,
    conversion_factor: parsedInput.data.conversion_factor,
    notes: parsedInput.data.notes,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A conversion from this unit already exists for this ingredient." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not create the conversion. Please try again." };
  }

  revalidatePath("/ingredients");
  return null;
}

export async function updateConversion(
  _previousState: ConversionActionState,
  formData: FormData,
): Promise<ConversionActionState> {
  const parsedInput = updateConversionSchema.safeParse({
    id: formData.get("id"),
    ingredient_id: formData.get("ingredient_id"),
    from_unit_id: formData.get("from_unit_id"),
    to_unit_id: formData.get("to_unit_id"),
    conversion_factor: Number(formData.get("conversion_factor")),
    notes: formData.get("notes") || null,
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid conversion details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("ingredient_unit_conversions")
    .update({
      from_unit_id: parsedInput.data.from_unit_id,
      to_unit_id: parsedInput.data.to_unit_id,
      conversion_factor: parsedInput.data.conversion_factor,
      notes: parsedInput.data.notes,
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") {
      return { message: "A conversion from this unit already exists for this ingredient." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not update the conversion. Please try again." };
  }

  revalidatePath("/ingredients");
  return null;
}

export async function deleteConversion(
  _previousState: ConversionActionState,
  formData: FormData,
): Promise<ConversionActionState> {
  const parsedInput = deleteConversionSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) return { message: "Invalid request." };

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("ingredient_unit_conversions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) return { message: "We could not delete the conversion. Please try again." };

  revalidatePath("/ingredients");
  return null;
}
