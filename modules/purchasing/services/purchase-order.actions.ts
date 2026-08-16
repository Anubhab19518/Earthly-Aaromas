"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import {
  purchaseOrderSchema,
  purchaseOrderItemSchema,
} from "@/modules/purchasing/schemas/purchase-order.schema";

export type PurchaseOrderActionState = { message: string } | null;

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
    required_permission_code: "inventory.manage",
    target_organization_id: membership.organization_id,
  });

  return canManage
    ? { organizationId: membership.organization_id, userId: userData.user.id }
    : null;
}

async function updatePoTotalWithTax(supabase: any, poId: string, organizationId: string) {
  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("quantity, expected_cost, tax_category_id")
    .eq("po_id", poId);

  if (!items) return;

  const { data: taxCategories } = await supabase
    .from("tax_categories")
    .select("id, tax_rates(rate_percentage)")
    .eq("organization_id", organizationId);

  const taxMap = new Map<string, number>();
  if (taxCategories) {
    taxCategories.forEach((tc: any) => {
      const rates = tc.tax_rates;
      const rate = rates && rates.length > 0 ? Number(rates[0].rate_percentage) : 0;
      taxMap.set(tc.id, rate);
    });
  }

  const grandTotal = items.reduce((acc: number, item: any) => {
    const baseLine = item.quantity * item.expected_cost;
    const taxRate = item.tax_category_id ? (taxMap.get(item.tax_category_id) || 0) : 0;
    const taxAmount = baseLine * (taxRate / 100);
    return acc + baseLine + taxAmount;
  }, 0);

  await supabase.from("purchase_orders").update({ total_expected_cost: grandTotal }).eq("id", poId);
}

// ─── Location Validation Helper ──────────────────────────────────────────────

async function isWarehouseLocation(
  supabase: any,
  locationId: string,
  organizationId: string
): Promise<boolean> {
  const { data: location } = await supabase
    .from("locations")
    .select("location_types!inner(code)")
    .eq("id", locationId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .single();

  return location?.location_types?.code === "WAREHOUSE";
}

// ─── Compute base quantity from conversions ──────────────────────────────────

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
    throw new Error(
      "No unit conversion found for the selected ingredient and purchase unit.",
    );
  }

  return quantity * Number(conversion.conversion_factor);
}

// ─── Create Purchase Order ───────────────────────────────────────────────────

export async function createPurchaseOrder(
  _previousState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const parsed = purchaseOrderSchema.safeParse({
    supplierId: formData.get("supplierId"),
    locationId: formData.get("locationId"),
    expectedDeliveryDate: formData.get("expectedDeliveryDate") || null,
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const isWarehouse = await isWarehouseLocation(supabase, parsed.data.locationId, auth.organizationId);
  if (!isWarehouse) {
    return { message: "Purchase Orders can only be created for Warehouses." };
  }

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      organization_id: auth.organizationId,
      supplier_id: parsed.data.supplierId,
      location_id: parsed.data.locationId,
      expected_delivery_date: parsed.data.expectedDeliveryDate,
      notes: parsed.data.notes,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23514") return { message: error.message };
    return { message: "Could not create Purchase Order. Please try again." };
  }

  // Handle optional initial items if provided in creation form
  const itemsJson = formData.get("items") as string | null;
  if (itemsJson) {
    try {
      const items = JSON.parse(itemsJson);
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const convertedBaseQuantity = await computeBaseQuantity(
            supabase,
            item.ingredientId,
            item.unitId,
            Number(item.quantity),
            auth.organizationId,
          );

          await supabase.from("purchase_order_items").insert({
            po_id: po.id,
            ingredient_id: item.ingredientId,
            unit_id: item.unitId,
            quantity: Number(item.quantity),
            converted_base_quantity: convertedBaseQuantity,
            expected_cost: Number(item.expectedCost),
            tax_category_id: item.taxCategoryId || null,
          });
        }
        await updatePoTotalWithTax(supabase, po.id, auth.organizationId);
      }
    } catch (err: any) {
      console.error("Error inserting initial PO items:", err);
    }
  }

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${po.id}`);
}

// ─── Update Purchase Order ───────────────────────────────────────────────────

export async function updatePurchaseOrder(
  _previousState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const id = formData.get("id") as string;
  const parsed = purchaseOrderSchema.safeParse({
    supplierId: formData.get("supplierId"),
    locationId: formData.get("locationId"),
    expectedDeliveryDate: formData.get("expectedDeliveryDate") || null,
    notes: formData.get("notes") || null,
  });

  if (!parsed.success || !id) return { message: parsed.error?.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const isWarehouse = await isWarehouseLocation(supabase, parsed.data.locationId, auth.organizationId);
  if (!isWarehouse) {
    return { message: "Purchase Orders can only be updated for Warehouses." };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      supplier_id: parsed.data.supplierId,
      location_id: parsed.data.locationId,
      expected_delivery_date: parsed.data.expectedDeliveryDate,
      notes: parsed.data.notes,
    })
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .eq("status", "DRAFT");

  if (error) {
    if (error.code === "27000" || error.code === "23514") return { message: error.message };
    return { message: "Could not update Purchase Order." };
  }

  revalidatePath(`/purchase-orders/${id}`);
  return null;
}

// ─── Change PO Status ────────────────────────────────────────────────────────

export async function changePurchaseOrderStatus(
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !status) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not update status." };
  }

  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/purchase-orders");
  return null;
}

// ─── Update Purchase Order Notes ──────────────────────────────────────────────

export async function updatePurchaseOrderNotes(
  poId: string,
  notes: string | null,
): Promise<PurchaseOrderActionState> {
  if (!poId) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("purchase_orders")
    .update({ notes: notes?.trim() || null })
    .eq("id", poId)
    .eq("organization_id", auth.organizationId);

  if (error) return { message: "Could not update notes." };

  revalidatePath(`/purchase-orders/${poId}`);
  return null;
}

// ─── Add Purchase Order Item ─────────────────────────────────────────────────

export async function addPurchaseOrderItem(
  _previousState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const parsed = purchaseOrderItemSchema.safeParse({
    ingredientId: formData.get("ingredientId"),
    unitId: formData.get("unitId"),
    quantity: Number(formData.get("quantity")),
    expectedCost: Number(formData.get("expectedCost")),
    taxCategoryId: formData.get("taxCategoryId") || null,
  });

  const poId = formData.get("poId") as string;

  if (!parsed.success || !poId) return { message: parsed.error?.issues[0]?.message ?? "Invalid item details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  // Verify the PO is DRAFT
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status, organization_id")
    .eq("id", poId)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!po) return { message: "Purchase Order not found." };
  if (po.status !== "DRAFT") return { message: "Items can only be added to DRAFT Purchase Orders." };

  let convertedBaseQuantity: number;
  try {
    convertedBaseQuantity = await computeBaseQuantity(
      supabase,
      parsed.data.ingredientId,
      parsed.data.unitId,
      parsed.data.quantity,
      auth.organizationId,
    );
  } catch (err: any) {
    return { message: err.message };
  }

  const { error } = await supabase.from("purchase_order_items").insert({
    po_id: poId,
    ingredient_id: parsed.data.ingredientId,
    unit_id: parsed.data.unitId,
    quantity: parsed.data.quantity,
    converted_base_quantity: convertedBaseQuantity,
    expected_cost: parsed.data.expectedCost,
    tax_category_id: parsed.data.taxCategoryId,
  });

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not add item." };
  }

  // Update total_expected_cost
  await updatePoTotalWithTax(supabase, poId, auth.organizationId);

  revalidatePath(`/purchase-orders/${poId}`);
  return null;
}

// ─── Delete Purchase Order Item ──────────────────────────────────────────────

export async function deletePurchaseOrderItem(
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  const id = formData.get("id") as string;
  const poId = formData.get("poId") as string;
  if (!id || !poId) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("purchase_order_items")
    .delete()
    .eq("id", id)
    .eq("po_id", poId);

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not delete item." };
  }

  // Update total_expected_cost
  await updatePoTotalWithTax(supabase, poId, auth.organizationId);

  revalidatePath(`/purchase-orders/${poId}`);
  return null;
}
