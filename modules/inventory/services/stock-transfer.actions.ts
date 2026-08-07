"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { cookies } from "next/headers";
import {
  stockTransferSchema,
  stockTransferItemSchema,
} from "@/modules/inventory/schemas/stock-transfer.schema";

export type StockTransferActionState = { message: string } | null;

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
      "No unit conversion found for the selected ingredient and unit.",
    );
  }

  return quantity * Number(conversion.conversion_factor);
}

// ─── Create Stock Transfer ───────────────────────────────────────────────────

export async function createStockTransfer(
  _previousState: StockTransferActionState,
  formData: FormData,
): Promise<StockTransferActionState> {
  const parsed = stockTransferSchema.safeParse({
    sourceLocationId: formData.get("sourceLocationId"),
    destinationLocationId: formData.get("destinationLocationId"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid details." };

  if (parsed.data.sourceLocationId === parsed.data.destinationLocationId) {
    return { message: "Source and destination locations cannot be the same." };
  }

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const isWarehouse = await isWarehouseLocation(supabase, parsed.data.sourceLocationId, auth.organizationId);
  if (!isWarehouse) {
    return { message: "Stock Transfers can only originate from Warehouses." };
  }

  const { data: transfer, error } = await supabase
    .from("stock_transfers")
    .insert({
      organization_id: auth.organizationId,
      source_location_id: parsed.data.sourceLocationId,
      destination_location_id: parsed.data.destinationLocationId,
      notes: parsed.data.notes,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23514") return { message: error.message };
    return { message: "Could not create Stock Transfer. Please try again." };
  }

  revalidatePath("/stock-transfers");
  redirect(`/stock-transfers/${transfer.id}`);
}

// ─── Update Stock Transfer ───────────────────────────────────────────────────

export async function updateStockTransfer(
  _previousState: StockTransferActionState,
  formData: FormData,
): Promise<StockTransferActionState> {
  const id = formData.get("id") as string;
  const parsed = stockTransferSchema.safeParse({
    sourceLocationId: formData.get("sourceLocationId"),
    destinationLocationId: formData.get("destinationLocationId"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success || !id) return { message: parsed.error?.issues[0]?.message ?? "Invalid details." };

  if (parsed.data.sourceLocationId === parsed.data.destinationLocationId) {
    return { message: "Source and destination locations cannot be the same." };
  }

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const isWarehouse = await isWarehouseLocation(supabase, parsed.data.sourceLocationId, auth.organizationId);
  if (!isWarehouse) {
    return { message: "Stock Transfers can only originate from Warehouses." };
  }

  const { error } = await supabase
    .from("stock_transfers")
    .update({
      source_location_id: parsed.data.sourceLocationId,
      destination_location_id: parsed.data.destinationLocationId,
      notes: parsed.data.notes,
    })
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .eq("status", "DRAFT");

  if (error) {
    if (error.code === "27000" || error.code === "23514") return { message: error.message };
    return { message: "Could not update Stock Transfer." };
  }

  revalidatePath(`/stock-transfers/${id}`);
  return null;
}

// ─── Change Status ───────────────────────────────────────────────────────────

export async function changeStockTransferStatus(
  formData: FormData,
): Promise<StockTransferActionState> {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !status) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { data: transfer } = await supabase
    .from("stock_transfers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!transfer) return { message: "Transfer not found." };

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  if (status === "SHIPPED") {
    if (transfer.status !== "DRAFT") return { message: "Only DRAFT transfers can be shipped." };
    if (activeBranchId !== transfer.source_location_id) {
      return { message: "You must be acting from the source location to ship this transfer." };
    }
  } else if (status === "CANCELLED") {
    if (transfer.status !== "DRAFT") return { message: "Only DRAFT transfers can be cancelled." };
    // Usually only source or creator cancels it
  }

  const { error } = await supabase
    .from("stock_transfers")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", auth.organizationId);

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not update status." };
  }

  revalidatePath(`/stock-transfers/${id}`);
  revalidatePath("/stock-transfers");
  return null;
}

// ─── Add Item ────────────────────────────────────────────────────────────────

export async function addStockTransferItem(
  _previousState: StockTransferActionState,
  formData: FormData,
): Promise<StockTransferActionState> {
  const parsed = stockTransferItemSchema.safeParse({
    ingredientId: formData.get("ingredientId"),
    unitId: formData.get("unitId"),
    quantity: Number(formData.get("quantity")),
  });

  const transferId = formData.get("transferId") as string;

  if (!parsed.success || !transferId) return { message: parsed.error?.issues[0]?.message ?? "Invalid item details." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  // Verify the Transfer is DRAFT
  const { data: transfer } = await supabase
    .from("stock_transfers")
    .select("status, organization_id")
    .eq("id", transferId)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!transfer) return { message: "Stock Transfer not found." };
  if (transfer.status !== "DRAFT") return { message: "Items can only be added to DRAFT Stock Transfers." };

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

  const { error } = await supabase.from("stock_transfer_items").insert({
    transfer_id: transferId,
    ingredient_id: parsed.data.ingredientId,
    unit_id: parsed.data.unitId,
    quantity: parsed.data.quantity,
    converted_base_quantity: convertedBaseQuantity,
  });

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not add item." };
  }

  revalidatePath(`/stock-transfers/${transferId}`);
  return null;
}

// ─── Delete Item ─────────────────────────────────────────────────────────────

export async function deleteStockTransferItem(
  formData: FormData,
): Promise<StockTransferActionState> {
  const id = formData.get("id") as string;
  const transferId = formData.get("transferId") as string;
  if (!id || !transferId) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { error } = await supabase
    .from("stock_transfer_items")
    .delete()
    .eq("id", id)
    .eq("transfer_id", transferId);

  if (error) {
    if (error.code === "27000") return { message: error.message };
    return { message: "Could not delete item." };
  }

  revalidatePath(`/stock-transfers/${transferId}`);
  return null;
}

// ─── Receive Transfer ────────────────────────────────────────────────────────

export async function receiveStockTransfer(
  formData: FormData,
): Promise<StockTransferActionState> {
  const id = formData.get("id") as string;
  if (!id) return { message: "Invalid request." };

  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth) return { message: "Unauthorized." };

  const { data: transfer } = await supabase
    .from("stock_transfers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!transfer) return { message: "Transfer not found." };
  if (transfer.status !== "SHIPPED") return { message: "Only SHIPPED transfers can be received." };

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  if (activeBranchId !== transfer.destination_location_id) {
    return { message: "You must be acting from the destination location to receive this transfer." };
  }

  const { error } = await supabase.rpc("post_stock_transfer", { p_transfer_id: id });

  if (error) {
    if (error.code === "27000" || error.code === "23514") return { message: error.message };
    return { message: error.message || "Could not receive transfer. Please try again." };
  }

  revalidatePath(`/stock-transfers/${id}`);
  revalidatePath("/stock-transfers");
  revalidatePath("/inventory");
  return null;
}
