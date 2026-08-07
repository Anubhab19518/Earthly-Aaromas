"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import {
  menuCategorySchema,
  menuItemSchema,
  menuVariantSchema,
  recipeItemSchema,
  branchMenuConfigSchema,
} from "@/modules/menu/schemas/menu.schema";

export type MenuActionState = { message: string } | null;

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
    required_permission_code: "master_data.manage",
    target_organization_id: membership.organization_id,
  });

  return canManage
    ? { organizationId: membership.organization_id, userId: userData.user.id }
    : null;
}

// ─── Menu Categories ─────────────────────────────────────────────────────────

export async function createMenuCategory(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = menuCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("menu_categories")
    .insert({
      organization_id: auth.organizationId,
      name: parsed.data.name,
      description: parsed.data.description,
      is_active: parsed.data.is_active,
    });

  if (error) return { message: "Could not create Menu Category." };

  revalidatePath("/menu");
  return null;
}

export async function updateMenuCategory(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const id = formData.get("id") as string;
  const parsed = menuCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });

  if (!parsed.success || !id) return { message: parsed.error?.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("menu_categories")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      is_active: parsed.data.is_active,
    })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { message: "Could not update Menu Category." };

  revalidatePath("/menu");
  return null;
}

export async function deleteMenuCategory(
  formData: FormData,
): Promise<MenuActionState> {
  const id = formData.get("id") as string;
  if (!id) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("menu_categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { message: "Could not delete Menu Category. It may be in use." };

  revalidatePath("/menu");
  return null;
}

// ─── Menu Items ──────────────────────────────────────────────────────────────

export async function createMenuItem(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = menuItemSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description") || null,
    image_url: formData.get("image_url") || null,
    tax_category_id: formData.get("tax_category_id") || null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { data: item, error } = await supabase
    .from("menu_items")
    .insert({
      organization_id: auth.organizationId,
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description,
      image_url: parsed.data.image_url,
      tax_category_id: parsed.data.tax_category_id,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single();

  if (error) return { message: "Could not create Menu Item." };

  revalidatePath("/menu");
  redirect(`/menu/items/${item.id}`);
}

export async function updateMenuItem(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const id = formData.get("id") as string;
  const parsed = menuItemSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description") || null,
    image_url: formData.get("image_url") || null,
    tax_category_id: formData.get("tax_category_id") || null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });

  if (!parsed.success || !id) return { message: parsed.error?.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("menu_items")
    .update({
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description,
      image_url: parsed.data.image_url,
      tax_category_id: parsed.data.tax_category_id,
      is_active: parsed.data.is_active,
    })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { message: "Could not update Menu Item." };

  revalidatePath("/menu");
  revalidatePath(`/menu/items/${id}`);
  return null;
}

export async function deleteMenuItem(
  formData: FormData,
): Promise<MenuActionState> {
  const id = formData.get("id") as string;
  if (!id) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("menu_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { message: "Could not delete Menu Item. It may be in use." };

  revalidatePath("/menu");
  redirect("/menu");
}

// ─── Menu Variants ───────────────────────────────────────────────────────────

export async function createMenuVariant(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const parsed = menuVariantSchema.safeParse({
    menu_item_id: formData.get("menu_item_id"),
    name: formData.get("name"),
    default_price: Number(formData.get("default_price")),
    sku: formData.get("sku") || null,
    serving_size: formData.get("serving_size") || null,
    prep_time_mins: formData.get("prep_time_mins") ? Number(formData.get("prep_time_mins")) : null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { data: variant, error } = await supabase
    .from("menu_variants")
    .insert({
      organization_id: auth.organizationId,
      menu_item_id: parsed.data.menu_item_id,
      name: parsed.data.name,
      default_price: parsed.data.default_price,
      sku: parsed.data.sku,
      serving_size: parsed.data.serving_size,
      prep_time_mins: parsed.data.prep_time_mins,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single();

  if (error) return { message: "Could not create Menu Variant." };

  revalidatePath(`/menu/items/${parsed.data.menu_item_id}`);
  redirect(`/menu/variants/${variant.id}`);
}

export async function updateMenuVariant(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const id = formData.get("id") as string;
  const parsed = menuVariantSchema.safeParse({
    menu_item_id: formData.get("menu_item_id"),
    name: formData.get("name"),
    default_price: Number(formData.get("default_price")),
    sku: formData.get("sku") || null,
    serving_size: formData.get("serving_size") || null,
    prep_time_mins: formData.get("prep_time_mins") ? Number(formData.get("prep_time_mins")) : null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });

  if (!parsed.success || !id) return { message: parsed.error?.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("menu_variants")
    .update({
      name: parsed.data.name,
      default_price: parsed.data.default_price,
      sku: parsed.data.sku,
      serving_size: parsed.data.serving_size,
      prep_time_mins: parsed.data.prep_time_mins,
      is_active: parsed.data.is_active,
    })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { message: "Could not update Menu Variant." };

  revalidatePath(`/menu/items/${parsed.data.menu_item_id}`);
  revalidatePath(`/menu/variants/${id}`);
  return null;
}

export async function deleteMenuVariant(
  formData: FormData,
): Promise<MenuActionState> {
  const id = formData.get("id") as string;
  const itemId = formData.get("menu_item_id") as string;
  if (!id || !itemId) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("menu_variants")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) return { message: "Could not delete Menu Variant. It may be in use." };

  revalidatePath(`/menu/items/${itemId}`);
  redirect(`/menu/items/${itemId}`);
}

// ─── Recipe Items ────────────────────────────────────────────────────────────

async function computeBaseQuantity(
  supabase: any,
  ingredientId: string,
  purchaseUnitId: string,
  quantity: number,
  organizationId: string,
): Promise<number> {
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("base_unit_id")
    .eq("id", ingredientId)
    .eq("organization_id", organizationId)
    .single();

  if (!ingredient) throw new Error("Ingredient not found.");

  if (ingredient.base_unit_id === purchaseUnitId) {
    return quantity;
  }

  const { data: conversion } = await supabase
    .from("ingredient_unit_conversions")
    .select("conversion_factor")
    .eq("ingredient_id", ingredientId)
    .eq("from_unit_id", purchaseUnitId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!conversion) {
    throw new Error("No unit conversion found for the selected ingredient and unit.");
  }

  return quantity * Number(conversion.conversion_factor);
}

export async function addRecipeItem(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const variantId = formData.get("variant_id") as string;
  const ingredientId = formData.get("ingredient_id") as string;
  const inputQuantity = Number(formData.get("quantity"));
  const inputUnitId = formData.get("unit_id") as string;

  if (!variantId || !ingredientId || !inputQuantity || !inputUnitId) {
    return { message: "Invalid request." };
  }

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  let baseQuantity: number;
  try {
    baseQuantity = await computeBaseQuantity(
      supabase,
      ingredientId,
      inputUnitId,
      inputQuantity,
      auth.organizationId,
    );
  } catch (err: any) {
    return { message: err.message };
  }

  const parsed = recipeItemSchema.safeParse({
    variant_id: variantId,
    ingredient_id: ingredientId,
    quantity_in_base_unit: baseQuantity,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const { error } = await supabase
    .from("recipe_items")
    .insert({
      organization_id: auth.organizationId,
      variant_id: parsed.data.variant_id,
      ingredient_id: parsed.data.ingredient_id,
      quantity_in_base_unit: parsed.data.quantity_in_base_unit,
    });

  if (error) {
    if (error.code === "23505") return { message: "Ingredient is already in the recipe." };
    return { message: "Could not add recipe item." };
  }

  revalidatePath(`/menu/variants/${variantId}`);
  return null;
}

export async function deleteRecipeItem(
  formData: FormData,
): Promise<MenuActionState> {
  const id = formData.get("id") as string;
  const variantId = formData.get("variant_id") as string;
  if (!id || !variantId) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("recipe_items")
    .delete()
    .eq("id", id)
    .eq("variant_id", variantId)
    .eq("organization_id", auth.organizationId);

  if (error) return { message: "Could not delete recipe item." };

  revalidatePath(`/menu/variants/${variantId}`);
  return null;
}

// ─── Branch Config ───────────────────────────────────────────────────────────

export async function saveBranchMenuConfig(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const locationId = formData.get("location_id") as string;
  const variantId = formData.get("variant_id") as string;
  const isAvailable = formData.get("is_available") === "on" || formData.get("is_available") === "true";
  const priceOverrideStr = formData.get("price_override") as string;
  const priceOverride = priceOverrideStr && priceOverrideStr.trim() !== "" ? Number(priceOverrideStr) : null;

  const parsed = branchMenuConfigSchema.safeParse({
    location_id: locationId,
    variant_id: variantId,
    is_available: isAvailable,
    price_override: priceOverride,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("branch_menu_configs")
    .upsert({
      organization_id: auth.organizationId,
      location_id: parsed.data.location_id,
      variant_id: parsed.data.variant_id,
      is_available: parsed.data.is_available,
      price_override: parsed.data.price_override,
    }, {
      onConflict: "location_id, variant_id"
    });

  if (error) return { message: "Could not save branch configuration." };

  revalidatePath(`/menu/variants/${variantId}`);
  return null;
}
