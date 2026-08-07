"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createIngredientSchema,
  updateIngredientSchema,
  deleteIngredientSchema,
  createIngredientCategorySchema,
  updateIngredientCategorySchema,
  deleteIngredientCategorySchema,
} from "@/modules/ingredients/schemas/ingredient.schema";

export type IngredientActionState = {
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

export async function createIngredientCategory(
  _previousState: IngredientActionState,
  formData: FormData,
): Promise<IngredientActionState> {
  const parsedInput = createIngredientCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid category details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase.from("ingredient_categories").insert({
    organization_id: organizationId,
    name: parsedInput.data.name,
    description: parsedInput.data.description,
  });

  if (error) {
    if (error.code === "23505") return { message: "A category with this name already exists." };
    return { message: "We could not create the category. Please try again." };
  }

  revalidatePath("/ingredients");
  return null;
}

export async function updateIngredientCategory(
  _previousState: IngredientActionState,
  formData: FormData,
): Promise<IngredientActionState> {
  const parsedInput = updateIngredientCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || null,
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid category details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("ingredient_categories")
    .update({
      name: parsedInput.data.name,
      description: parsedInput.data.description,
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") return { message: "A category with this name already exists." };
    return { message: "We could not update the category. Please try again." };
  }

  revalidatePath("/ingredients");
  return null;
}

export async function deleteIngredientCategory(
  _previousState: IngredientActionState,
  formData: FormData,
): Promise<IngredientActionState> {
  const parsedInput = deleteIngredientCategorySchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) return { message: "Invalid request." };

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  // Note: If there are ingredients using this category, this might fail or we should check first.
  // We're using soft delete, so it won't trigger FK constraint issues immediately if we soft delete.
  const { error } = await supabase
    .from("ingredient_categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) return { message: "We could not delete the category. Please try again." };

  revalidatePath("/ingredients");
  return null;
}

export async function createIngredient(
  _previousState: IngredientActionState,
  formData: FormData,
): Promise<IngredientActionState> {
  const parsedInput = createIngredientSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    category_id: formData.get("category_id"),
    base_unit_id: formData.get("base_unit_id"),
    default_purchase_unit_id: formData.get("default_purchase_unit_id") || null,
    min_stock: formData.get("min_stock") ? Number(formData.get("min_stock")) : null,
    max_stock: formData.get("max_stock") ? Number(formData.get("max_stock")) : null,
    standard_cost: formData.get("standard_cost") ? Number(formData.get("standard_cost")) : null,
    is_perishable: formData.get("is_perishable") === "true",
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid ingredient details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase.from("ingredients").insert({
    organization_id: organizationId,
    name: parsedInput.data.name,
    sku: parsedInput.data.sku,
    category_id: parsedInput.data.category_id,
    base_unit_id: parsedInput.data.base_unit_id,
    default_purchase_unit_id: parsedInput.data.default_purchase_unit_id,
    min_stock: parsedInput.data.min_stock,
    max_stock: parsedInput.data.max_stock,
    standard_cost: parsedInput.data.standard_cost,
    is_perishable: parsedInput.data.is_perishable,
    status: parsedInput.data.status,
  });

  if (error) {
    if (error.code === "23505") return { message: "An ingredient with this SKU already exists." };
    if (error.code === "23514") return { message: error.message || "Constraint violation." };
    return { message: "We could not create the ingredient. Please try again." };
  }

  revalidatePath("/ingredients");
  return null;
}

export async function updateIngredient(
  _previousState: IngredientActionState,
  formData: FormData,
): Promise<IngredientActionState> {
  const parsedInput = updateIngredientSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    sku: formData.get("sku"),
    category_id: formData.get("category_id"),
    base_unit_id: formData.get("base_unit_id"),
    default_purchase_unit_id: formData.get("default_purchase_unit_id") || null,
    min_stock: formData.get("min_stock") ? Number(formData.get("min_stock")) : null,
    max_stock: formData.get("max_stock") ? Number(formData.get("max_stock")) : null,
    standard_cost: formData.get("standard_cost") ? Number(formData.get("standard_cost")) : null,
    is_perishable: formData.get("is_perishable") === "true",
    status: formData.get("status") || "ACTIVE",
  });

  if (!parsedInput.success) {
    return { message: parsedInput.error.issues[0]?.message ?? "Invalid ingredient details." };
  }

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("ingredients")
    .update({
      name: parsedInput.data.name,
      sku: parsedInput.data.sku,
      category_id: parsedInput.data.category_id,
      base_unit_id: parsedInput.data.base_unit_id,
      default_purchase_unit_id: parsedInput.data.default_purchase_unit_id,
      min_stock: parsedInput.data.min_stock,
      max_stock: parsedInput.data.max_stock,
      standard_cost: parsedInput.data.standard_cost,
      is_perishable: parsedInput.data.is_perishable,
      status: parsedInput.data.status,
    })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "23505") return { message: "An ingredient with this SKU already exists." };
    if (error.code === "23514") return { message: error.message || "Constraint violation." };
    return { message: "We could not update the ingredient. Please try again." };
  }

  revalidatePath("/ingredients");
  return null;
}

export async function deleteIngredient(
  _previousState: IngredientActionState,
  formData: FormData,
): Promise<IngredientActionState> {
  const parsedInput = deleteIngredientSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsedInput.success) return { message: "Invalid request." };

  const supabase = await createClient();
  const organizationId = await getActiveOrganizationId(supabase);

  if (!organizationId) return { message: "Unauthorized or missing permission." };

  const { error } = await supabase
    .from("ingredients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedInput.data.id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) return { message: "We could not delete the ingredient. Please try again." };

  revalidatePath("/ingredients");
  return null;
}
