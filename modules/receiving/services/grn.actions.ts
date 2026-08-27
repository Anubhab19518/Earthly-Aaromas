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

async function isValidLocation(
  supabase: any,
  locationId: string,
  organizationId: string
): Promise<boolean> {
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  return !!location;
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

  let targetSupplierId = parsed.data.supplier_id;
  let targetLocationId = parsed.data.warehouse_location_id;

  // Rule 2: If linked to a PO, inherit the PO's destination and supplier strictly
  if (parsed.data.purchase_order_id) {
    const { data: po } = await supabase
      .from("purchase_orders")
      .select("id, supplier_id, location_id, status")
      .eq("id", parsed.data.purchase_order_id)
      .eq("organization_id", auth.organizationId)
      .single();

    if (!po) return { message: "Linked Purchase Order not found." };
    targetSupplierId = po.supplier_id;
    targetLocationId = po.location_id;
  } else if (
    parsed.data.supplier_id === "__LOCAL_VENDOR__" ||
    (parsed.data.local_vendor_name && parsed.data.local_vendor_name.trim().length > 0)
  ) {
    // Handle Local / Unregistered Vendor for direct purchases
    const vendorName = parsed.data.local_vendor_name?.trim() || "Local / Unregistered Vendor";
    const { data: existingSupplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .ilike("name", vendorName)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingSupplier) {
      targetSupplierId = existingSupplier.id;
    } else {
      const { data: newSupplier, error: supErr } = await supabase
        .from("suppliers")
        .insert({
          organization_id: auth.organizationId,
          name: vendorName,
          status: "ACTIVE",
          notes: "Local / Unregistered Vendor for direct shop purchases",
        })
        .select("id")
        .single();

      if (supErr) {
        return { message: "Could not create local vendor: " + supErr.message };
      }
      targetSupplierId = newSupplier.id;
    }
  }

  const isValid = await isValidLocation(supabase, targetLocationId, auth.organizationId);
  if (!isValid) {
    return { message: "Invalid receiving facility / location selected." };
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
      supplier_id: targetSupplierId,
      warehouse_location_id: targetLocationId,
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

  // If a purchase order was selected, auto-populate the line items with remaining balances
  if (parsed.data.purchase_order_id) {
    const { data: poItems } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", parsed.data.purchase_order_id);

    if (poItems && poItems.length > 0) {
      // Query already POSTED receipts for this PO to calculate remaining balances
      const { data: postedGrns } = await supabase
        .from("goods_receipts")
        .select("id")
        .eq("purchase_order_id", parsed.data.purchase_order_id)
        .eq("status", "POSTED");

      const postedGrnIds = (postedGrns || []).map((g: any) => g.id);
      let postedGrnItems: any[] = [];
      if (postedGrnIds.length > 0) {
        const { data: items } = await supabase
          .from("goods_receipt_items")
          .select("purchase_order_item_id, ingredient_id, received_quantity, converted_base_quantity")
          .in("goods_receipt_id", postedGrnIds);
        postedGrnItems = items || [];
      }

      const alreadyReceivedByPoi = new Map<string, number>();
      if (postedGrnItems.length > 0) {
        postedGrnItems.forEach((item: any) => {
          const key = item.purchase_order_item_id || item.ingredient_id;
          const current = alreadyReceivedByPoi.get(key) || 0;
          alreadyReceivedByPoi.set(key, current + Number(item.received_quantity));
        });
      }

      const grnItemsToInsert = await Promise.all(
        poItems.map(async (poi: any) => {
          const prevReceived = alreadyReceivedByPoi.get(poi.id) || alreadyReceivedByPoi.get(poi.ingredient_id) || 0;
          const remainingQty = Math.max(0, Number(poi.quantity) - prevReceived);
          const initialQty = remainingQty > 0 ? remainingQty : Number(poi.quantity);

          let convertedBaseQty: number;
          try {
            convertedBaseQty = await computeBaseQuantity(
              supabase,
              poi.ingredient_id,
              poi.unit_id,
              initialQty,
              auth.organizationId
            );
          } catch {
            convertedBaseQty = initialQty;
          }

          return {
            goods_receipt_id: grn.id,
            purchase_order_item_id: poi.id,
            ingredient_id: poi.ingredient_id,
            purchase_unit_id: poi.unit_id,
            received_quantity: initialQty,
            converted_base_quantity: convertedBaseQty,
            unit_cost: poi.expected_cost,
            tax_category_id: poi.tax_category_id,
            line_total: initialQty * Number(poi.expected_cost),
          };
        })
      );

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

  // Fetch current GRN
  const { data: currentGrn } = await supabase
    .from("goods_receipts")
    .select("purchase_order_id, warehouse_location_id, supplier_id")
    .eq("id", parsed.data.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!currentGrn) return { message: "Goods Receipt not found." };

  let targetLocationId = parsed.data.warehouse_location_id;
  let targetSupplierId = parsed.data.supplier_id;

  // Rule 2: If linked to a PO, destination and supplier remain strictly locked to PO
  if (currentGrn.purchase_order_id) {
    targetLocationId = currentGrn.warehouse_location_id;
    targetSupplierId = currentGrn.supplier_id;
  }

  const isValid = await isValidLocation(supabase, targetLocationId, auth.organizationId);
  if (!isValid) {
    return { message: "Invalid receiving facility / location selected." };
  }

  const { error } = await supabase
    .from("goods_receipts")
    .update({
      supplier_id: targetSupplierId,
      warehouse_location_id: targetLocationId,
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

// ─── Update GRN Remarks ─────────────────────────────────────────────────────

export async function updateGrnRemarks(
  id: string,
  remarks: string,
): Promise<GrnActionState> {
  if (!id) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("goods_receipts")
    .update({ remarks: remarks.trim() || null })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) {
    return { message: "Could not update remarks." };
  }

  revalidatePath(`/receiving/${id}`);
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
    purchase_order_item_id: formData.get("purchase_order_item_id") || null,
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

  // Rule 3: Prevent Over-Receiving on PO line
  if (parsed.data.purchase_order_item_id) {
    const { data: poItem } = await supabase
      .from("purchase_order_items")
      .select("id, quantity")
      .eq("id", parsed.data.purchase_order_item_id)
      .single();

    if (poItem) {
      const { data: existingItems } = await supabase
        .from("goods_receipt_items")
        .select("received_quantity, goods_receipts!inner(status)")
        .eq("purchase_order_item_id", poItem.id)
        .neq("goods_receipts.status", "CANCELLED");

      const alreadyRecorded = (existingItems || []).reduce(
        (acc: number, cur: any) => acc + Number(cur.received_quantity || 0),
        0
      );
      const remainingAllowed = Math.max(0, Number(poItem.quantity) - alreadyRecorded);

      if (parsed.data.received_quantity > remainingAllowed) {
        return {
          message: `Cannot receive ${parsed.data.received_quantity}. Maximum remaining on PO is ${remainingAllowed} (Ordered: ${poItem.quantity}, Already Recorded/Received: ${alreadyRecorded}).`,
        };
      }
    }
  }

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
    purchase_order_item_id: parsed.data.purchase_order_item_id,
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
    purchase_order_item_id: formData.get("purchase_order_item_id") || null,
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

  // Rule 3: Prevent Over-Receiving on PO line
  if (parsed.data.purchase_order_item_id) {
    const { data: poItem } = await supabase
      .from("purchase_order_items")
      .select("id, quantity")
      .eq("id", parsed.data.purchase_order_item_id)
      .single();

    if (poItem) {
      const { data: existingItems } = await supabase
        .from("goods_receipt_items")
        .select("id, received_quantity, goods_receipts!inner(status)")
        .eq("purchase_order_item_id", poItem.id)
        .neq("id", parsed.data.id)
        .neq("goods_receipts.status", "CANCELLED");

      const alreadyRecorded = (existingItems || []).reduce(
        (acc: number, cur: any) => acc + Number(cur.received_quantity || 0),
        0
      );
      const remainingAllowed = Math.max(0, Number(poItem.quantity) - alreadyRecorded);

      if (parsed.data.received_quantity > remainingAllowed) {
        return {
          message: `Cannot receive ${parsed.data.received_quantity}. Maximum remaining on PO is ${remainingAllowed} (Ordered: ${poItem.quantity}, Already Recorded/Received in other items: ${alreadyRecorded}).`,
        };
      }
    }
  }

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
      purchase_order_item_id: parsed.data.purchase_order_item_id,
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

// ─── Post GRN (Rule 5: Stock and Ledgers update ONLY on POST) ────────────────

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
  revalidatePath("/inventory/ledger");
  revalidatePath("/financial");
  return null;
}
