"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createGrnSchema,
  updateGrnSchema,
  addGrnItemSchema,
  updateGrnItemSchema,
} from "@/modules/receiving/schemas/grn.schema";

export type GrnActionState = { message: string } | null;

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
  receivedQuantity: number,
  organizationId: string,
): Promise<number> {
  // Fetch the ingredient's base unit
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("base_unit_id")
    .eq("id", ingredientId)
    .eq("organization_id", organizationId)
    .single();

  if (!ingredient) throw new Error("Ingredient not found.");

  // If purchase unit IS the base unit, no conversion needed
  if (ingredient.base_unit_id === purchaseUnitId) {
    return receivedQuantity;
  }

  // Look up the conversion factor
  const { data: conversion } = await supabase
    .from("ingredient_unit_conversions")
    .select("conversion_factor")
    .eq("ingredient_id", ingredientId)
    .eq("from_unit_id", purchaseUnitId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!conversion) {
    throw new Error(
      "No unit conversion found for the selected ingredient and purchase unit. Please configure it in the Ingredients module first.",
    );
  }

  return receivedQuantity * Number(conversion.conversion_factor);
}

// ─── Create GRN ─────────────────────────────────────────────────────────────

export async function createGrn(
  _previousState: GrnActionState,
  formData: FormData,
): Promise<GrnActionState> {
  const parsed = createGrnSchema.safeParse({
    supplier_id: formData.get("supplier_id"),
    warehouse_location_id: formData.get("warehouse_location_id"),
    purchase_order_id: formData.get("purchase_order_id") || null,
    invoice_number: formData.get("invoice_number") || null,
    invoice_date: formData.get("invoice_date") || null,
    received_date: formData.get("received_date"),
    remarks: formData.get("remarks") || null,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const isWarehouse = await isWarehouseLocation(supabase, parsed.data.warehouse_location_id, auth.organizationId);
  if (!isWarehouse) {
    return { message: "Goods Receipts can only be created for Warehouses." };
  }

  // Generate GRN number safely via sequence
  const { data: seqVal, error: seqErr } = await supabase.rpc("next_sequence_value", {
    p_organization_id: auth.organizationId,
    p_sequence_name: "GRN",
  });
  if (seqErr) return { message: "Failed to generate GRN number." };

  const grnNumber = `GRN-${String(seqVal).padStart(4, "0")}`;

  const { data: grn, error } = await supabase
    .from("goods_receipts")
    .insert({
      organization_id: auth.organizationId,
      grn_number: grnNumber,
      supplier_id: parsed.data.supplier_id,
      warehouse_location_id: parsed.data.warehouse_location_id,
      purchase_order_id: parsed.data.purchase_order_id,
      invoice_number: parsed.data.invoice_number,
      invoice_date: parsed.data.invoice_date,
      received_date: parsed.data.received_date,
      remarks: parsed.data.remarks,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23514") return { message: error.message };
    return { message: "Could not create GRN. Please try again." };
  }

  // If a purchase order was selected, auto-populate the line items
  if (parsed.data.purchase_order_id) {
    const { data: poItems } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", parsed.data.purchase_order_id);

    if (poItems && poItems.length > 0) {
      // Calculate remaining quantities (simplified to order quantity for now, you could subtract received if needed)
      // Here we just insert all items from PO into GRN line items as draft
      const grnItemsToInsert = poItems.map((poi: any) => ({
        goods_receipt_id: grn.id,
        ingredient_id: poi.ingredient_id,
        purchase_unit_id: poi.unit_id,
        received_quantity: poi.quantity, // Default to expected quantity, user can edit it
        converted_base_quantity: poi.converted_base_quantity,
        unit_cost: poi.expected_cost,
        tax_category_id: poi.tax_category_id,
        line_total: poi.quantity * poi.expected_cost,
      }));

      await supabase.from("goods_receipt_items").insert(grnItemsToInsert);
    }
  }

  revalidatePath("/receiving");
  redirect(`/receiving/${grn.id}`);
}

// ─── Update GRN header ───────────────────────────────────────────────────────

export async function updateGrn(
  _previousState: GrnActionState,
  formData: FormData,
): Promise<GrnActionState> {
  const parsed = updateGrnSchema.safeParse({
    id: formData.get("id"),
    supplier_id: formData.get("supplier_id"),
    warehouse_location_id: formData.get("warehouse_location_id"),
    invoice_number: formData.get("invoice_number") || null,
    invoice_date: formData.get("invoice_date") || null,
    received_date: formData.get("received_date"),
    remarks: formData.get("remarks") || null,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("goods_receipts")
    .update({
      supplier_id: parsed.data.supplier_id,
      warehouse_location_id: parsed.data.warehouse_location_id,
      invoice_number: parsed.data.invoice_number,
      invoice_date: parsed.data.invoice_date,
      received_date: parsed.data.received_date,
      remarks: parsed.data.remarks,
    })
    .eq("id", parsed.data.id)
    .eq("organization_id", auth.organizationId)
    .eq("status", "DRAFT");

  if (error) {
    if (error.code === "27000" || error.code === "23514") return { message: error.message };
    return { message: "Could not update GRN." };
  }

  revalidatePath(`/receiving/${parsed.data.id}`);
  return null;
}

// ─── Cancel GRN ─────────────────────────────────────────────────────────────

export async function cancelGrn(
  _previousState: GrnActionState,
  formData: FormData,
): Promise<GrnActionState> {
  const id = formData.get("id") as string;
  if (!id) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("goods_receipts")
    .update({ status: "CANCELLED" })
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .eq("status", "DRAFT");

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not cancel GRN." };
  }

  revalidatePath(`/receiving/${id}`);
  revalidatePath("/receiving");
  return null;
}

// ─── Delete GRN (soft delete, DRAFT only) ───────────────────────────────────

export async function deleteGrn(
  _previousState: GrnActionState,
  formData: FormData,
): Promise<GrnActionState> {
  const id = formData.get("id") as string;
  if (!id) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("goods_receipts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .eq("status", "DRAFT")
    .is("deleted_at", null);

  if (error) return { message: "Could not delete GRN." };

  revalidatePath("/receiving");
  redirect("/receiving");
}

// ─── Add GRN Item ────────────────────────────────────────────────────────────

export async function addGrnItem(
  _previousState: GrnActionState,
  formData: FormData,
): Promise<GrnActionState> {
  const parsed = addGrnItemSchema.safeParse({
    goods_receipt_id: formData.get("goods_receipt_id"),
    ingredient_id: formData.get("ingredient_id"),
    purchase_unit_id: formData.get("purchase_unit_id"),
    received_quantity: Number(formData.get("received_quantity")),
    unit_cost: Number(formData.get("unit_cost")),
    tax_category_id: formData.get("tax_category_id") || null,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid item details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  // Verify the GRN is DRAFT and belongs to this org
  const { data: grn } = await supabase
    .from("goods_receipts")
    .select("status, organization_id")
    .eq("id", parsed.data.goods_receipt_id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!grn) return { message: "GRN not found." };
  if (grn.status !== "DRAFT") return { message: "Items can only be added to DRAFT GRNs." };

  // Compute base quantity server-side
  let convertedBaseQuantity: number;
  try {
    convertedBaseQuantity = await computeBaseQuantity(
      supabase,
      parsed.data.ingredient_id,
      parsed.data.purchase_unit_id,
      parsed.data.received_quantity,
      auth.organizationId,
    );
  } catch (err: any) {
    return { message: err.message };
  }

  const lineTotal = parsed.data.received_quantity * parsed.data.unit_cost;

  const { error } = await supabase.from("goods_receipt_items").insert({
    goods_receipt_id: parsed.data.goods_receipt_id,
    ingredient_id: parsed.data.ingredient_id,
    purchase_unit_id: parsed.data.purchase_unit_id,
    received_quantity: parsed.data.received_quantity,
    converted_base_quantity: convertedBaseQuantity,
    unit_cost: parsed.data.unit_cost,
    tax_category_id: parsed.data.tax_category_id,
    line_total: lineTotal,
  });

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not add item." };
  }

  revalidatePath(`/receiving/${parsed.data.goods_receipt_id}`);
  return null;
}

// ─── Update GRN Item ─────────────────────────────────────────────────────────

export async function updateGrnItem(
  _previousState: GrnActionState,
  formData: FormData,
): Promise<GrnActionState> {
  const parsed = updateGrnItemSchema.safeParse({
    id: formData.get("id"),
    goods_receipt_id: formData.get("goods_receipt_id"),
    ingredient_id: formData.get("ingredient_id"),
    purchase_unit_id: formData.get("purchase_unit_id"),
    received_quantity: Number(formData.get("received_quantity")),
    unit_cost: Number(formData.get("unit_cost")),
    tax_category_id: formData.get("tax_category_id") || null,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid item details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  let convertedBaseQuantity: number;
  try {
    convertedBaseQuantity = await computeBaseQuantity(
      supabase,
      parsed.data.ingredient_id,
      parsed.data.purchase_unit_id,
      parsed.data.received_quantity,
      auth.organizationId,
    );
  } catch (err: any) {
    return { message: err.message };
  }

  const lineTotal = parsed.data.received_quantity * parsed.data.unit_cost;

  const { error } = await supabase
    .from("goods_receipt_items")
    .update({
      ingredient_id: parsed.data.ingredient_id,
      purchase_unit_id: parsed.data.purchase_unit_id,
      received_quantity: parsed.data.received_quantity,
      converted_base_quantity: convertedBaseQuantity,
      unit_cost: parsed.data.unit_cost,
      tax_category_id: parsed.data.tax_category_id,
      line_total: lineTotal,
    })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not update item." };
  }

  revalidatePath(`/receiving/${parsed.data.goods_receipt_id}`);
  return null;
}

// ─── Delete GRN Item ─────────────────────────────────────────────────────────

export async function deleteGrnItem(
  _previousState: GrnActionState,
  formData: FormData,
): Promise<GrnActionState> {
  const id = formData.get("id") as string;
  const grnId = formData.get("goods_receipt_id") as string;
  if (!id || !grnId) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("goods_receipt_items")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not delete item." };
  }

  revalidatePath(`/receiving/${grnId}`);
  return null;
}

// ─── Post GRN ────────────────────────────────────────────────────────────────

export async function postGrn(
  _previousState: GrnActionState,
  formData: FormData,
): Promise<GrnActionState> {
  const id = formData.get("id") as string;
  if (!id) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase.rpc("post_goods_receipt", { p_grn_id: id });

  if (error) {
    if (error.code === "27000" || error.code === "23514") return { message: error.message };
    return { message: error.message || "Could not post GRN. Please try again." };
  }

  revalidatePath(`/receiving/${id}`);
  revalidatePath("/receiving");
  revalidatePath("/inventory");
  return null;
}
