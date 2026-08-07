"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createUnitSchema,
  updateUnitSchema,
  deleteUnitSchema,
} from "@/modules/units/schemas/unit.schema";

export type UnitActionState = {
  message: string;
} | null;

async function checkGlobalManagePermission(supabase: any) {
  const { data: canManage } = await supabase.rpc("has_global_permission", {
    required_permission_code: "master_data.manage",
  });
  return canManage === true;
}

export async function createUnit(
  _previousState: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  const parsedInput = createUnitSchema.safeParse({
    name: formData.get("name"),
    symbol: formData.get("symbol"),
    measurement_category: formData.get("measurement_category"),
    is_base_unit: formData.get("is_base_unit") === "true",
    base_unit_id: formData.get("base_unit_id") || null,
    conversion_factor: formData.get("conversion_factor") || null,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid unit details." };
  }

  const supabase = await createClient();
  const canManage = await checkGlobalManagePermission(supabase);

  if (!canManage) {
    return { message: "Unauthorized or missing permission." };
  }

  const { error } = await supabase.from("units").insert({
    name: parsedInput.data.name,
    symbol: parsedInput.data.symbol,
    measurement_category: parsedInput.data.measurement_category,
    is_base_unit: parsedInput.data.is_base_unit,
    base_unit_id: parsedInput.data.is_base_unit ? null : parsedInput.data.base_unit_id,
    conversion_factor: parsedInput.data.is_base_unit ? null : parsedInput.data.conversion_factor,
    status: parsedInput.data.status,
  });

  if (error) {
    if (error.code === "23505") {
      return { message: "A unit with this name or symbol already exists." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not create the unit. Please try again." };
  }

  revalidatePath("/units");
  return null;
}

export async function updateUnit(
  _previousState: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  const parsedInput = updateUnitSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    symbol: formData.get("symbol"),
    measurement_category: formData.get("measurement_category"),
    is_base_unit: formData.get("is_base_unit") === "true",
    base_unit_id: formData.get("base_unit_id") || null,
    conversion_factor: formData.get("conversion_factor") || null,
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid unit details." };
  }

  const supabase = await createClient();
  const canManage = await checkGlobalManagePermission(supabase);

  if (!canManage) {
    return { message: "Unauthorized or missing permission." };
  }

  const { error } = await supabase
    .from("units")
    .update({
      name: parsedInput.data.name,
      symbol: parsedInput.data.symbol,
      measurement_category: parsedInput.data.measurement_category,
      is_base_unit: parsedInput.data.is_base_unit,
      base_unit_id: parsedInput.data.is_base_unit ? null : parsedInput.data.base_unit_id,
      conversion_factor: parsedInput.data.is_base_unit ? null : parsedInput.data.conversion_factor,
      status: parsedInput.data.status,
    })
    .eq("id", parsedInput.data.id);

  if (error) {
    if (error.code === "23505") {
      return { message: "A unit with this name or symbol already exists." };
    }
    if (error.code === "23514") {
      return { message: error.message || "Constraint violation." };
    }
    return { message: "We could not update the unit. Please try again." };
  }

  revalidatePath("/units");
  return null;
}

export async function deleteUnit(
  _previousState: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  const parsedInput = deleteUnitSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) {
    return { message: "Invalid request." };
  }

  const supabase = await createClient();
  const canManage = await checkGlobalManagePermission(supabase);

  if (!canManage) {
    return { message: "Unauthorized or missing permission." };
  }

  const { error } = await supabase
    .from("units")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", parsedInput.data.id)
    .is("deleted_at", null);

  if (error) {
    return { message: "We could not delete the unit. Please try again." };
  }

  revalidatePath("/units");
  return null;
}
